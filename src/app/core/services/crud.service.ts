import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



@Injectable({ providedIn: 'root' })
export class CrudService {
    private http = inject(HttpClient);
    private apiUrl = '';
    init(domain: string): void {
        this.apiUrl = 'https://sl-dev-backend-7ab91220ba93.herokuapp.com/';
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

    create(type: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, type);
    }

    update(type: any): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/${type.id}`, type);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
