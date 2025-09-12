// crud.service.ts
import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpRequest } from '@angular/common/http';
import { Observable, timer } from 'rxjs';
import { filter, map, switchMap, takeWhile, finalize } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type MediaPipelinePhase = 'uploading' | 'processing' | 'ready' | 'error';

export interface MediaPipelineEvent {
    phase: MediaPipelinePhase;
    /** 0..100 durante 'uploading'; undefined para otras fases */
    progress?: number;
    /** Respuesta final cuando 'ready' (del /medias/status) */
    result?: {
        status: 'ready' | 'processing';
        type?: 'video' | 'image' | 'legacy' | 'unknown';
        url?: string;
        thumbnails?: string[];
    };
    /** Mensaje de error si falla algo */
    error?: string;
    /** filename devuelto por /medias/upload (útil para guardar o seguir consultando) */
    filename?: string;
}

@Injectable({ providedIn: 'root' })
export class CrudService {
    private http = inject(HttpClient);
    private apiUrl = '';

    init(domain: string): void {
        this.apiUrl = environment.apiUrl;
        if (domain) {
            this.apiUrl += domain;
        }
    }

    getAll(): Observable<any[]> {
        return this.http.get<any[]>(this.apiUrl);
    }

    getById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`);
    }

    getCustom(path: string, type?: any): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${path}`, (type) ? type : {});
    }

    create(body: any): Observable<any> {
        if (body.promotion && body.promotion == "") body.promotion = null;
        return this.http.post<any>(this.apiUrl, body);
    }

    createCustom(path: string, body: any): Observable<any> {
        if (body.promotion && body.promotion == "") body.promotion = null;
        return this.http.post<any>(`${this.apiUrl}/${path}`, body);
    }


    deleteCustom(path: string, body: any): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/${path}`, body);
    }

    update(body: any): Observable<any> {
        if (body.promotion == "") {
            body.promotion = null;
        }
        return this.http.put<any>(`${this.apiUrl}/${body.id}`, body);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    /**
     * Subida + procesamiento para MEDIAS:
     * - Debes haber hecho init('medias') antes de llamar.
     * - Emite:
     *    { phase:'uploading', progress:0..100 }
     *    { phase:'processing', filename }
     *    { phase:'ready', result:{ url, thumbnails, ... }, filename }
     */
    uploadAndProcessMedia(file: File, pollMs = 1500, maxPollMinutes = 10): Observable<MediaPipelineEvent> {
        const form = new FormData();
        form.append('file', file);

        // 1) Subida con progreso -> /medias/upload
        const req = new HttpRequest('POST', `${this.apiUrl}/upload`, form, { reportProgress: true });

        return this.http.request(req).pipe(
            map((event: HttpEvent<any>): MediaPipelineEvent | null => {
                if (event.type === HttpEventType.UploadProgress) {
                    const progress = event.total ? Math.round(100 * (event.loaded / event.total)) : 0;
                    return { phase: 'uploading', progress };
                }
                if (event.type === HttpEventType.Response) {
                    // Esperamos 202 Accepted con { filename }
                    const filename = event.body?.filename as string | undefined;
                    if (!filename) {
                        return { phase: 'error', error: 'Respuesta de subida inválida' };
                    }
                    return { phase: 'processing', filename };
                }
                return null;
            }),
            // Filtramos nulls (eventos no relevantes)
            filter((e): e is MediaPipelineEvent => !!e),
            // 2) Cuando entramos en 'processing', hacemos polling a /medias/status/{filename}
            switchMap((ev) => {
                if (ev.phase !== 'processing' || !ev.filename) return [ev];

                const filename = ev.filename;
                const maxTicks = Math.ceil((maxPollMinutes * 60 * 1000) / pollMs);

                return timer(0, pollMs).pipe(
                    switchMap(() => this.getCustom(`status/${filename}`)),
                    map((statusRes): MediaPipelineEvent => {
                        if (statusRes?.status === 'ready') {
                            return {
                                phase: 'ready',
                                filename,
                                result: {
                                    status: 'ready',
                                    type: statusRes?.type,
                                    url: statusRes?.url,
                                    thumbnails: statusRes?.thumbnails ?? []
                                }
                            };
                        }
                        // Aceptamos 202 o cualquier payload distinto a ready como "processing"
                        return { phase: 'processing', filename };
                    }),
                    // Emitimos hasta que llegue 'ready' o se agote el tiempo
                    takeWhile((e, idx) => e.phase !== 'ready' && idx < maxTicks, true),
                    finalize(() => { /* opcional: logs */ })
                );
            })
        );
    }
}
