'use client'
import React, {useContext, useEffect, useRef, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import {PlusCircleOutlined} from "@ant-design/icons";
import {nextUploadImage} from "@/app/api/vision/route";
import {nextRecipeDescription} from "@/app/api/gptChat/route";
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";
import {useTextContext} from "@/app/store/store";
import {nextDalleGeneration} from "@/app/api/DALLE/route";
import ImagePrompt from "@/app/components/utils/ImagePrompt/ImagePrompt";



const thumbsContainer = {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 32,
    justifyContent: 'center'
};

const thumb = {
    display: 'inline-flex',
    borderRadius: 2,
    border: '1px solid #eaeaea',
    marginBottom: 8,
    marginRight: 8,
    width: "auto",
    height: "100%",
    padding: 4,
    boxSizing: 'border-box'
};

const thumbInner = {
    display: 'flex',
    minWidth: 0,
    overflow: 'hidden'
};

const img = {
    display: 'block',
    width: 'auto',
    height: '100%'
};

const dropzone = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: '#bdbdbd',
    outline: 'none',
    transition: 'border .24s ease-in-out'
};


const Upload = (props) => {
    const { imagePrompt, updateTextPromptContext, updateImagePromptContext, updateNewListItem} = useTextContext();
    const [files, setFiles] = useState([]);
    const [imgData, setImgData] = useState(null);
    const [newUpload, setNewUpload] = useState('');
    const [taskID, setTaskID] = useState(null);
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [visionResponse, setVisionResponse] = useState(null);
    const canvasRef = useRef(null);
    const [imgDescription, setImgDescription] = useState('');
    const [newRecipe, setNewRecipe] = useState('');
    const [newDALLEURL, setNewDALLEURL] = useState('');
    const [loadingTopic, setLoadingTopic] = useState('');
    const [isDALLELoading, setIsDALLELoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const {getRootProps, getInputProps} = useDropzone({
        accept: {
            'image/*': []
        },
        onDrop: acceptedFiles => {
            setFiles(acceptedFiles.map(file => Object.assign(file, {
                preview: URL.createObjectURL(file)
            })));
            setImgData(acceptedFiles[0]);
        }
    });

    const thumbs = files.map(file => (
        <div style={thumb} key={file.name}>
            <div style={thumbInner}>
                <img
                    src={file.preview}
                    style={img}
                    onLoad={() => { URL.revokeObjectURL(file.preview) }}
                />
            </div>
        </div>
    ));

    useEffect(()=>{
        updateTextPromptContext("Upload an image to get started");
        updateImagePromptContext({
            message:"",
            data: ""
        });
    }, [])

    useEffect(()=>{
        imgData && updateTextPromptContext("Click on Process to get a recipe");
    }, [imgData])

    useEffect(() => {
        if(loadingTopic === "vision") {
            updateTextPromptContext("Let me take a look...");
        }
        if (loadingTopic === "chat") {
            updateTextPromptContext("Brainstorming a recipe. Hold on ...");
        }
        if (loadingTopic === "dalle") {
            updateTextPromptContext("Here is your Recipe! Now, Let me draw you a picture. Hold on ...");
        }
        if (loadingTopic === "done") {
            updateTextPromptContext("Voila! Here is your recipe and picture!")
        }
    }, [loadingTopic]);


    useEffect(() => {
        if(imgDescription) {
            setLoadingTopic("chat")
           handleRecipe(imgDescription).then(r => console.log(r));
        }
        return function cleanup() {
            if(imgDescription) {
                handleRecipe(imgDescription).then(r => console.log(r));
            }
        };
    }, [imgDescription]);


    useEffect(() => {
        if(newRecipe) {
            setLoadingTopic("dalle")
            handleDALLEPrompt(newRecipe).then(r => console.log(r));
        }
        return function cleanup() {
            if(newRecipe) {
                // updateTextPromptContext(newRecipe);
                handleDALLEPrompt(newRecipe).then(r => console.log(r));
            }
        };
    }, [newRecipe]);

    useEffect(() => {
         if (newDALLEURL) {
             setLoadingTopic("done");
         }
    }, [newDALLEURL]);


    const handleDALLEPrompt = async (msg) => {
        try {
            const response = await nextDalleGeneration(msg);
            setNewDALLEURL(response?.data);
            updateImagePromptContext(response);
        } catch (error){
            updateTextPromptContext("Oops something went wrong when drawing the picture...");
            console.error("Error generating DALLE prompt:", error);
        }
    }


    const handleRecipe = async (msg) => {
        try {
            const response = await nextRecipeDescription(msg);
            setNewRecipe(response?.data);
            console.log(response)
        } catch (error){
            updateTextPromptContext("Oops something went wrong when brainstorming the recipe...");
            console.error("Error generating recipe:", error);
        }
    }
    const handleProcess = async () => {
        const formData = new FormData();
        formData.append('image_file', imgData)
        try {
            const responseData = await nextUploadImage(formData);
            console.log(responseData)
            setImgDescription(responseData?.data?.choices[0]?.message?.content)
        } catch (error) {
            updateTextPromptContext("Oops something went wrong when processing the image...");
            console.error("Error processing image upload:", error);
        }
    }

    const handleSaveListItem = () => {
        const data = {
            "description": newRecipe,
            "image": newDALLEURL
        }
        updateNewListItem(data);
    }

    return (
        <section className="container">
            <div className="fixed left-0 top-0 flex flex-col w-full justify-center border-none border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
                {
                    newDALLEURL?
                        <div className="hover:cursor-pointer" onClick={handleSaveListItem}>
                        <span>📥</span>
                    </div>:<></>
                }
            </div>
            <div className=" flex-col justify-center justify-items-center items-center">
                {
                    imagePrompt && imagePrompt?.data &&  <ImagePrompt obj={imagePrompt} url={imagePrompt?.data}/>
                }
                {
                    newRecipe && <TextPrompt text={newRecipe}/>
                }
            </div>
            {
                thumbs?.length > 0?
                    <div className="mt-5 flex justify-center items-center">
                        <button disabled={isLoading} onClick={handleProcess} className="group rounded-full border border-transparent px-5 py-2 transition-all duration-300 ease-in-out border-gray-300 bg-gray-100 dark:border-neutral-700 dark:bg-neutral-800/30 hover:border-gray-500 hover:bg-gradient-to-r from-gray-100 to-gray-200 dark:border-neutral-700 dark:from-neutral-800/30 dark:to-neutral-800/40 active:bg-gray-300 active:dark:bg-gray-600">
                            Process
                        </button>
                    </div>
                    :<></>
            }
            <div style={thumbsContainer}>
                {
                    thumbs
                }
            </div>
            <div style={dropzone} {...getRootProps({className: 'dropzone'})}>
                <input {...getInputProps()} />
                <div className=" align-middle flex flex-row self-center transition-transform duration-300 ease-in-out transform hover:scale-110">
                    <p className="transition-transform duration-300 ease-in-out transform hover:scale-110 cursor-pointer active:scale-90">
                        <PlusCircleOutlined  style={{
                            verticalAlign: 'middle',
                        }}/>&nbsp; {thumbs?.length > 0?"Click again to change image":"Drag and drop some files here, or click to select files"}
                    </p>
                </div>
            </div>
        </section>
    );
}

export default Upload;