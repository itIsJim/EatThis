import React from "react";
import HeaderPage from "@/app/components/HeaderPage";
import List from "@/app/list/List";
import {GlobalProvider} from "@/app/store/store";


const Page: React.FC = () => {


    return (
        <GlobalProvider>
                <HeaderPage>
                    <List/>
                </HeaderPage>
        </GlobalProvider>
    );
};

export default Page;