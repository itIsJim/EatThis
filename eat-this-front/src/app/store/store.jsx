'use client'
import React, {createContext, useContext, useEffect, useState} from 'react';


import {TextPromptContext} from "./types"
export const useTextContext = () => {
    const context = useContext(TextPromptContext);
    if (context === undefined) {
        throw new Error('useTextContext must be used within a GlobalProvider');
    }
    return context;
};

export const GlobalProvider = ({ children }) => {
    const[headerText, setHeaderText] = useState("Welcome to Eat This")
    const[imagePrompt, setImagePrompt] = useState({
        message:"",
        data:""
    })
    const updateTextPromptContext = (newValues) => {
        setHeaderText(newValues);
    };

    const updateImagePromptContext = (newValues) => {
        setImagePrompt(newValues);
    };

    const updateNewListItem = (newValues) => {
        const oldList = JSON.parse(localStorage.getItem('List'));
        localStorage.setItem('List', JSON.stringify(oldList ? [...oldList, newValues] : [newValues]));
        console.log(newValues)
    }

    return (
        <TextPromptContext.Provider value={{
            updateImagePromptContext,
            updateNewListItem,
            imagePrompt,
            headerText,
            updateTextPromptContext,
        }}>
            {children}
        </TextPromptContext.Provider>
    );
};
