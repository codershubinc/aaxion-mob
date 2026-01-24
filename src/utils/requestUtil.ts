import axios, { AxiosRequestConfig } from "axios";


export const fetcher = async (
    url: string,
    requestType: 'GET' | 'POST' | 'PUT' | 'DELETE',
    token?: string,
    body?: any,
    config?: AxiosRequestConfig,
    headers?: { [key: string]: string }
): Promise<any> => {
    try {
        const response = await axios({
            method: requestType,
            url: url,
            data: body,
            headers: {
                "Authorization": `Bearer ${token}`,
                ...headers
            },
            ...config,
        });
        console.log("got data ::", response.data);

        return response.data;
    } catch (error) {
        // Handle error appropriately
        console.error(`Error in ${requestType} request to ${url}:`, error);
        throw error;
    }
}; 