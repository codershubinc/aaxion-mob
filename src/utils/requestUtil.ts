import { API_URLS } from '@/constants/apiConstants'; // Ensure this matches your file path
import axios, { AxiosRequestConfig } from "axios";

export const fetcher = async (
    endpoint: string,
    requestType: 'GET' | 'POST' | 'PUT' | 'DELETE',
    queryParams?: { [key: string]: string },
    body?: any,
    config?: AxiosRequestConfig,
    headers?: { [key: string]: string }
): Promise<any> => {
    try {
        let url = endpoint;


        if (!endpoint.startsWith('http')) {
            const baseUrl = await API_URLS.getApiBaseUrl();
            if (!baseUrl) {
                console.warn("No Base URL found (Login required or config missing)");
                throw new Error("Server connection not configured");
            }
            url = `${baseUrl}${endpoint}`;
        }


        const token = await API_URLS.getApiToken();
        if (queryParams) {
            const queryString = new URLSearchParams(queryParams).toString();
            url += `?${queryString}`;
        }
        console.log("REQ uri", url);

        const response = await axios({
            method: requestType,
            url: url,
            data: body,
            headers: {
                "Authorization": token ? `Bearer ${token}` : "",
                "Content-Type": "application/json",
                ...headers
            },
            ...config,
        });


        return response.data;

    } catch (error: any) {

        const errorMsg = error.response?.data?.message || error || error.message;
        console.error(`Request Failed: [${requestType}] ${endpoint}`, errorMsg);


        throw error;
    }
};