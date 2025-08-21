import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EntityInfo {
    entityName: string;   // p.ej. "Device"
    className: string;    // FQN
    tableName?: string | null;
    idType?: string | null;
    attributes: Record<string, string>;
    rowCount?: number | null;
}

@Injectable({ providedIn: 'root' })
export class MetadataService {
    apiUrl = environment.apiUrl;
    constructor(private http: HttpClient) { }

    getEntities(withCount = false): Observable<EntityInfo[]> {
        const url = `${this.apiUrl}metadata/entities${withCount ? '?withCount=false' : ''}`;
        return this.http.get<EntityInfo[]>(url).pipe(
            catchError(() => of([])) // Fallback silencioso
        );
        // Si tu backend está en otro host, usa environment.apiUrl + '/metadata/entities'
    }
}
