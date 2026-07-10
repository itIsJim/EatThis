'use client'
import React, {useContext, useEffect, useRef, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import {PlusCircleOutlined, CameraOutlined} from "@ant-design/icons";
import {nextUploadImage, nextRecipeDescription, nextDalleGeneration, nextSegmentImage, nextDishScope} from "@/lib/api";
import TextPrompt from "@/app/components/utils/textPrompt/TextPrompt";
import {useTextContext} from "@/app/store/store";
import ImagePrompt from "@/app/components/utils/ImagePrompt/ImagePrompt";
import SegmentPreview from "@/app/components/utils/SegmentPreview/SegmentPreview";
import {Button} from "@/components/ui/button";



const thumbsContainer = {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 32,
    justifyContent: 'center'
};

const TRAIT_DIMENSIONS = ['taste', 'temperature', 'texture', 'style'];
const FALLBACK_TRAITS = [
    {name: 'savory', dimension: 'taste'},
    {name: 'sweet', dimension: 'taste'},
    {name: 'hot', dimension: 'temperature'},
    {name: 'cold', dimension: 'temperature'},
];

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
    const { imagePrompt, updateTextPromptContext, updateImagePromptContext, updateNewListItem, setIsNewItemSaved} = useTextContext();
    const [files, setFiles] = useState([]);
    const [imgData, setImgData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [imgDescription, setImgDescription] = useState('');
    const [newRecipe, setNewRecipe] = useState('');
    const [newDALLEURL, setNewDALLEURL] = useState('');
    const [loadingTopic, setLoadingTopic] = useState('');
    const [isDALLELoading, setIsDALLELoading] = useState(false);
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [segData, setSegData] = useState(null);
    const [isSegmenting, setIsSegmenting] = useState(false);
    const [traitOptions, setTraitOptions] = useState([]);
    const [traits, setTraits] = useState([]);
    const [isTraitLoading, setIsTraitLoading] = useState(false);
    const videoRef = useRef(null);

    const setPhoto = (file) => {
        const withPreview = Object.assign(file, {preview: URL.createObjectURL(file)});
        setFiles(prev => {
            prev.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
            return [withPreview];
        });
        setSegData(null);
        setTraitOptions([]);
        setTraits([]);
        setImgDescription('');
        setNewRecipe('');
        setNewDALLEURL('');
        setIsSaved(false);
        updateImagePromptContext({message: "", data: ""});
        setImgData(file);
    };

    const {getRootProps, getInputProps} = useDropzone({
        accept: {
            'image/*': []
        },
        onDrop: acceptedFiles => {
            acceptedFiles[0] && setPhoto(acceptedFiles[0]);
        }
    });

    useEffect(()=>{
        updateTextPromptContext("Upload an image to get started");
        updateImagePromptContext({
            message:"",
            data: ""
        });
    }, [])

    useEffect(() => {
        if (!imgData) return;
        let cancelled = false;
        const run = async () => {
            setIsSegmenting(true);
            updateTextPromptContext("Let me take a look at your ingredients ...");
            try {
                const compressed = await downscaleImage(imgData);
                const formData = new FormData();
                formData.append('image_file', compressed);
                const res = await nextSegmentImage(formData);
                if (cancelled) return;
                setSegData(res?.data || null);
                const found = res?.data?.ingredients;
                updateTextPromptContext(found
                    ? `I found: ${found}.\nWhat are you craving? Pick a few vibes and hit Make recipe!`
                    : "I couldn't spot anything — try another photo, or hit Make recipe anyway.");
                if (found) {
                    setIsTraitLoading(true);
                    nextDishScope(found)
                        .then(scope => {
                            if (cancelled) return;
                            const options = Array.isArray(scope?.data)
                                ? scope.data.filter(t => t?.name && t?.dimension)
                                : [];
                            setTraitOptions(options.length ? options : FALLBACK_TRAITS);
                        })
                        .catch(error => {
                            console.error("Trait analysis failed:", error);
                            if (!cancelled) setTraitOptions(FALLBACK_TRAITS);
                        })
                        .finally(() => { if (!cancelled) setIsTraitLoading(false); });
                }
            } catch (error) {
                if (cancelled) return;
                setSegData(null);
                updateTextPromptContext(error?.status === undefined
                    ? "Can't reach the kitchen server. Is the backend running?"
                    : "Couldn't analyze the photo — you can still hit Make recipe.");
                console.error("Error segmenting image:", error);
            } finally {
                if (!cancelled) setIsSegmenting(false);
            }
        };
        run();
        return () => { cancelled = true; };
    }, [imgData])

    useEffect(() => {
        if(loadingTopic === "vision") {
            updateTextPromptContext("Let me take a look ...");
        }
        else if (loadingTopic === "chat") {
            updateTextPromptContext("Brainstorming a recipe and drawing your dish. Hold on ...");
        }
        else if (loadingTopic === "dalle") {
            updateTextPromptContext("Here is your Recipe! Finishing your picture ...");
        }
        else if (loadingTopic === "done") {
            updateTextPromptContext("Voila! Here is your recipe and picture!")
        }
    }, [loadingTopic, setLoadingTopic]);


    useEffect(() => {
        if(imgDescription) {
            setLoadingTopic("chat")
            // Recipe and dish image are generated in parallel from the ingredient list
            handleRecipe(imgDescription);
            handleDALLEPrompt(imgDescription);
        }
    }, [imgDescription]);

    useEffect(() => {
        if (newRecipe && !newDALLEURL) {
            setLoadingTopic("dalle");
        }
    }, [newRecipe]);

    useEffect(() => {
        if (newDALLEURL && newRecipe) {
            setLoadingTopic("done");
        }
    }, [newDALLEURL, newRecipe]);

    useEffect(() => {
        if (isProcessing) {
            setLoadingTopic("vision");
        }
    }, [isProcessing]);

    useEffect(()=>{
        if(isSaved) {
            updateTextPromptContext("Recipe and Picture saved to your list!");
        }
        if (newDALLEURL && !isSaved) {
            setLoadingTopic("done");
        }

    }, [isSaved])


    const paidCallError = (error, fallbackMsg) => {
        if (error?.status === 401) return "Please sign in (top right) to generate recipes.";
        if (error?.status === 402) return "You're out of credits — top up to keep cooking.";
        if (error?.status === undefined) return "Can't reach the kitchen server. Is the backend running?";
        return fallbackMsg;
    };

    const handleDALLEPrompt = async (msg) => {
        try {
            const response = await nextDalleGeneration(msg);
            setNewDALLEURL(response?.data);
            updateImagePromptContext(response);
            setIsProcessing(false)
        } catch (error){
            updateTextPromptContext(paidCallError(error, "Oops something went wrong when drawing the picture..."));
            console.error("Error generating DALLE prompt:", error);
        }
    }


    const handleRecipe = async (msg) => {
        try {
            const response = await nextRecipeDescription(msg);
            setNewRecipe(response?.data);
        } catch (error){
            updateTextPromptContext(paidCallError(error, "Oops something went wrong when brainstorming the recipe..."));
            console.error("Error generating recipe:", error);
        }
    }
    const downscaleImage = (file, maxDim = 1024, quality = 0.85) =>
        new Promise((resolve) => {
            const image = new Image();
            const url = URL.createObjectURL(file);
            image.onload = () => {
                URL.revokeObjectURL(url);
                const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
                if (scale === 1 && file.size < 500 * 1024) return resolve(file);
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(image.width * scale);
                canvas.height = Math.round(image.height * scale);
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    blob => resolve(blob ? new File([blob], 'upload.jpg', {type: 'image/jpeg'}) : file),
                    'image/jpeg',
                    quality
                );
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file);
            };
            image.src = url;
        });

    const composeBrief = (ingredients) => {
        if (!ingredients) return ingredients;
        const parts = [`Ingredients: ${ingredients}`];
        if (traits.length) {
            const byDimension = {};
            traitOptions.forEach(t => {
                if (traits.includes(t.name)) {
                    (byDimension[t.dimension] = byDimension[t.dimension] || []).push(t.name);
                }
            });
            const constraints = Object.entries(byDimension)
                .map(([dimension, words]) => `${words.join(' and ')} (${dimension})`)
                .join(', ');
            parts.push(`The dish MUST be: ${constraints}.`);
        }
        return parts.join('\n');
    };

    const toggleTrait = (value) => {
        setTraits(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
    };

    const handleProcess = async () => {
        try {
            setIsSaved(false)
            if (segData?.ingredients) {
                // Ingredients already detected during the preview stage
                setImgDescription(composeBrief(segData.ingredients));
                return;
            }
            setIsProcessing(true)
            const compressed = await downscaleImage(imgData);
            const formData = new FormData();
            formData.append('image_file', compressed)
            const responseData = await nextUploadImage(formData);
            setImgDescription(composeBrief(responseData?.data))
        } catch (error) {
            updateTextPromptContext("Oops something went wrong when processing the image...");
            console.error("Error processing image upload:", error);
        }
    }

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false,
            });
            setCameraStream(stream);
            setIsCameraOpen(true);
        } catch (error) {
            updateTextPromptContext("Could not access the camera. Please allow camera access or upload a file instead.");
            console.error("Error opening camera:", error);
        }
    };

    const closeCamera = () => {
        cameraStream?.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video || !video.videoWidth) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            if (!blob) return;
            setPhoto(new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' }));
            closeCamera();
        }, 'image/jpeg', 0.9);
    };

    useEffect(() => {
        if (isCameraOpen && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
        }
    }, [isCameraOpen, cameraStream]);

    useEffect(() => {
        return () => {
            cameraStream?.getTracks().forEach(track => track.stop());
        };
    }, [cameraStream]);

    const handleSaveListItem = () => {
        const data = {
            "description": newRecipe,
            "image": newDALLEURL
        }
        updateNewListItem(data);
        setIsSaved(true)
        setIsNewItemSaved(true)
    }

    return (
        <section className="container">
            {
                newDALLEURL &&
                <div className="mb-3 flex w-full justify-center">
                    {
                        !isSaved?
                            <Button variant="outline" onClick={handleSaveListItem}>Save to list</Button>
                            :<span className="border-2 border-black bg-black px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white dark:border-white dark:bg-white dark:text-black">Saved</span>
                    }
                </div>
            }
            <div className="flex w-full flex-col items-center gap-4">
                {
                    imgDescription && !newDALLEURL &&
                    <div className="flex aspect-square w-full max-w-md flex-col items-center justify-center gap-5 border-2 border-black dark:border-white">
                        <div className="flex items-end gap-3" aria-hidden="true">
                            <span className="h-4 w-4 animate-bounce rounded-full bg-black dark:bg-white"/>
                            <span className="h-4 w-4 animate-bounce bg-black [animation-delay:120ms] dark:bg-white"/>
                            <span className="h-0 w-0 animate-bounce border-b-[16px] border-l-[9px] border-r-[9px] border-b-black border-l-transparent border-r-transparent [animation-delay:240ms] dark:border-b-white"/>
                        </div>
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">Rendering dish</span>
                    </div>
                }
                {
                    imagePrompt && imagePrompt?.data &&  <ImagePrompt obj={imagePrompt} url={imagePrompt?.data}/>
                }
                {
                    newRecipe && <TextPrompt text={newRecipe}/>
                }
            </div>
            {
                files?.length > 0 && !isSegmenting && segData?.ingredients &&
                <div className="mt-5 flex flex-col items-center gap-2">
                    {isTraitLoading && traitOptions.length === 0 && (
                        <div className="flex items-center gap-2">
                            {[0, 1, 2, 3].map(i => (
                                <span key={i} className="h-8 w-16 animate-pulse border-2 border-dashed border-black dark:border-white"/>
                            ))}
                        </div>
                    )}
                    {TRAIT_DIMENSIONS.map(dimension => {
                        const group = traitOptions.filter(t => t.dimension === dimension);
                        if (!group.length) return null;
                        return (
                            <div key={dimension} className="flex w-full max-w-xl flex-wrap items-center justify-center gap-2">
                                <span className="w-24 shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.25em] opacity-50">
                                    {dimension}
                                </span>
                                {group.map(({name}) => (
                                    <Button
                                        key={name}
                                        variant="outline"
                                        size="sm"
                                        className={traits.includes(name) ? 'bg-foreground text-background' : ''}
                                        onClick={() => toggleTrait(name)}
                                    >
                                        {name}
                                    </Button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            }
            {
                files?.length > 0?
                    <div className="mt-4 flex justify-center items-center">
                        <Button variant="outline" disabled={isLoading || isSegmenting} onClick={handleProcess}>
                            {isSegmenting ? "Analyzing ..." : "Make recipe"}
                        </Button>
                    </div>
                    :<></>
            }
            {
                files?.length > 0 &&
                <div style={thumbsContainer}>
                    <SegmentPreview
                        previewUrl={files[0]?.preview}
                        segData={segData}
                        isSegmenting={isSegmenting}
                    />
                </div>
            }
            <div style={dropzone} {...getRootProps({className: 'mt-2 cursor-pointer border-2 border-dashed border-black p-6 transition-colors hover:bg-black hover:text-white dark:border-white dark:hover:bg-white dark:hover:text-black'})}>
                <input {...getInputProps()} />
                <p className="text-xs font-bold uppercase tracking-[0.2em]">
                    <PlusCircleOutlined style={{verticalAlign: 'middle'}}/>&nbsp; {files?.length > 0?"Change image":"Drop an image or click to select"}
                </p>
            </div>
            {
                !isCameraOpen?
                    <div className="mt-4 flex justify-center items-center">
                        <Button variant="outline" onClick={openCamera}>
                            <CameraOutlined style={{verticalAlign: 'middle'}}/>&nbsp;Use camera
                        </Button>
                    </div>
                    :
                    <div className="mt-4 flex flex-col items-center gap-3">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full max-w-md border-2 border-black dark:border-white"
                            style={{maxHeight: 360, objectFit: 'cover'}}
                        />
                        <div className="flex flex-row gap-3">
                            <Button variant="outline" onClick={capturePhoto}>Capture</Button>
                            <Button variant="outline" onClick={closeCamera}>Cancel</Button>
                        </div>
                    </div>
            }
        </section>
    );
}

export default Upload;