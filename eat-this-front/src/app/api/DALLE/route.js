import {useContext} from "react";
import {TextPromptContext} from "@/app/components/HeaderPage";

export const nextDalleGeneration = async ( msg, options={}) => {

    try {
        const payload = JSON.stringify({ message: msg });
        const response = await fetch('http://127.0.0.1:8000/dalle/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: payload,
            ...options,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const responseData = await response.json();
        console.log('Chat Response:', responseData);
        return responseData;
    } catch (error) {
        console.error('Error sending data to backend:', error);
    }
};