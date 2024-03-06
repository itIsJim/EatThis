import {createContext, useContext} from "react";

interface TextPromptContextType {
    headerText: string;
    isNewItemSaved: boolean;
    imagePrompt: { message: string; data: string };
    newListItem: { description: string; image: string };
    list: { description: string; image: string }[];
    updateTextPromptContext: (newValues: string) => void;
    updateImagePromptContext: (newValues: { message: string; data: string }) => void;
    updateNewListItem: (newValues: { description: string; image: string }) => void;
    saveListItem: (value:boolean) => void;
}

export const TextPromptContext = createContext<TextPromptContextType | undefined>(undefined);
