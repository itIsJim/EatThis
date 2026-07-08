'use client'
import React, {useEffect, useState} from "react";
import {supabase} from "@/lib/supabase";
import {getConfig, getMe} from "@/lib/api";

const inputCls = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const btnCls = "rounded-full border border-gray-300 bg-gray-100 px-4 py-1.5 text-sm hover:border-gray-500 dark:border-neutral-700 dark:bg-neutral-800/30";

const AuthBar = () => {
    const [hosted, setHosted] = useState(false);
    const [session, setSession] = useState(null);
    const [credits, setCredits] = useState(null);
    const [formOpen, setFormOpen] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        getConfig().then(cfg => setHosted(cfg?.mode === 'hosted')).catch(() => setHosted(false));
        if (!supabase) return;
        supabase.auth.getSession().then(({data}) => setSession(data?.session || null));
        const {data: sub} = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
        return () => sub?.subscription?.unsubscribe();
    }, []);

    useEffect(() => {
        if (session && hosted) {
            getMe().then(me => setCredits(me?.credits)).catch(() => setCredits(null));
        } else {
            setCredits(null);
        }
    }, [session, hosted]);

    if (!hosted || !supabase) return null;

    const submit = async (e) => {
        e.preventDefault();
        setMessage('');
        const call = isSignUp
            ? supabase.auth.signUp({email, password})
            : supabase.auth.signInWithPassword({email, password});
        const {error, data} = await call;
        if (error) {
            setMessage(error.message);
        } else if (isSignUp && !data?.session) {
            setMessage("Check your email to confirm your account.");
        } else {
            setFormOpen(false);
            setPassword('');
        }
    };

    if (session) {
        return (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span className="rounded-full border border-gray-300 px-3 py-1 dark:border-neutral-700">
                    ⚡ {credits ?? '…'} credits
                </span>
                <button className={btnCls} onClick={() => supabase.auth.signOut()}>Sign out</button>
            </div>
        );
    }

    return (
        <div className="relative">
            <button className={btnCls} onClick={() => setFormOpen(!formOpen)}>Sign in</button>
            {formOpen && (
                <form onSubmit={submit} className="absolute right-0 top-10 z-30 flex w-64 flex-col gap-2 rounded-xl border border-gray-300 bg-white p-4 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
                    <input className={inputCls} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required/>
                    <input className={inputCls} type="password" placeholder="Password (8+ chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}/>
                    <button type="submit" className={btnCls}>{isSignUp ? "Create account" : "Sign in"}</button>
                    <button type="button" className="text-xs underline opacity-70" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? "Have an account? Sign in" : "New here? Create an account"}
                    </button>
                    {message && <p className="text-xs text-red-500">{message}</p>}
                </form>
            )}
        </div>
    );
};

export default AuthBar;
