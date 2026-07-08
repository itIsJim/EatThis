'use client'
import React, {useContext, useEffect, useState} from 'react';
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";
import ImagePrompt from "@/app/components/utils/ImagePrompt/ImagePrompt";
import {useTextContext} from "@/app/store/store";


const List = () => {
    const {updateTextPromptContext, setIsNewItemSaved} = useTextContext();
    const [list, setList] = useState([]);
    useEffect(() => {
        const savedList = JSON.parse(localStorage.getItem('List'));
        if (savedList) {
            setList(savedList);
        }
        updateTextPromptContext("Eat these")
        setIsNewItemSaved(false)
    }, []);
    return (
        <section className="container">
            {list && list.map((item, index) => {
                return (
                    item.description && item.image && <div key={index} className="p-3 sm:p-4 mb-4 bg-white rounded-lg shadow-md dark:bg-gray-800">
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full">
                            <ImagePrompt url={item.image}/>
                            <TextPrompt text={item.description} />
                        </div>
                    </div>
                )
            })}
        </section>
    )
}
export default List;