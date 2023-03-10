import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from "../../environments/environment";

@Injectable()
export class ApiService {

  constructor(private httpClient: HttpClient) {
    if (environment.production) {
      this.baseUrl = "./api/";
    }
  }


  baseUrl = "http://localhost:5000/api/";
  callServiceGet(url: string, success: any, error: any) {
    this.httpClient.get(this.baseUrl + url).subscribe((res) => {
      success(res)
    }, (err) => {
      error(err);
    });
  }
  callServicePost(url: string, data: any, success: any, error: any) {
    this.httpClient.post(this.baseUrl + url, data).subscribe((res) => {
      success(res)
    }, (err) => {
      error(err);
    });
  }
}
