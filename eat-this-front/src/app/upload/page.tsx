import React from "react";
import HeaderPage from "@/app/components/HeaderPage";
import {useDropzone} from "react-dropzone";
import Upload from "@/app/upload/Upload";
import {GlobalProvider} from "@/app/store/store";

const Page: React.FC = () => {


    return (
        <GlobalProvider>
                <HeaderPage>
                    <Upload/>
                </HeaderPage>
        </GlobalProvider>
    );
};

export default Page;