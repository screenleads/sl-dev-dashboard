import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { Device } from '../../features/device/models/device.model';

@Injectable({ providedIn: 'root' })
export class DeviceService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/devices';

    getAll(): Observable<Device[]> {
        return this.http.get<Device[]>(this.apiUrl);
    }

    getById(id: number): Observable<Device> {
        return this.http.get<Device>(`${this.apiUrl}/${id}`);
    }

    create(device: Device): Observable<Device> {
        return this.http.post<Device>(this.apiUrl, device);
    }

    update(device: Device): Observable<Device> {
        return this.http.put<Device>(`${this.apiUrl}/${device.id}`, device);
    }

    delete(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}