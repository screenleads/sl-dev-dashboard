import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';



@Injectable({ providedIn: 'root' })
export class CrudService {
    private http = inject(HttpClient);
    private apiUrl = '';
    init(domain: string): void {
        // this.apiUrl = 'http://localhost:3000/';
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

    getCustom(path: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${path}`);
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
        console.log(body);
        if (body.promotion == "") {
            console.log(body);
            body.promotion = null;
        }
        return this.http.put<any>(`${this.apiUrl}/${body.id}`, body);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
