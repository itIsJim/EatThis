import {useContext} from "react";
import {TextPromptContext} from "@/app/components/HeaderPage";

export const nextUploadImage = async ( imageFile, options={}) => {
    try {
        const response = await fetch('http://127.0.0.1:8000/image/upload', {
            method: 'POST',
            body: imageFile,
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Vision Response:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error sending data to backend:', error);
    }
};