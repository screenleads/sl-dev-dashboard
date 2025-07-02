import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DeviceType } from '../../features/device-type/models/device-type.model';

@Injectable({ providedIn: 'root' })
export class DeviceTypeService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/devices/types';

    getAll(): Observable<DeviceType[]> {
        return this.http.get<DeviceType[]>(this.apiUrl);
    }

    getById(id: number): Observable<DeviceType> {
        return this.http.get<DeviceType>(`${this.apiUrl}/${id}`);
    }

    create(type: DeviceType): Observable<DeviceType> {
        return this.http.post<DeviceType>(this.apiUrl, type);
    }

    update(type: DeviceType): Observable<DeviceType> {
        return this.http.put<DeviceType>(`${this.apiUrl}/${type.id}`, type);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
