'use client'
import React, {useEffect, useState} from "react";
import {supabase} from "@/lib/supabase";
import {getConfig, getMe} from "@/lib/api";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";

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
                <Badge variant="outline" className="border-2 border-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em]">
                    {credits ?? '…'} cr
                </Badge>
                <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>Sign out</Button>
            </div>
        );
    }

    return (
        <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(!formOpen)}>Sign in</Button>
            {formOpen && (
                <form onSubmit={submit} className="absolute right-0 top-12 z-30 flex w-64 flex-col gap-2 border-2 border-foreground bg-background p-4">
                    <Input type="email" placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} required/>
                    <Input type="password" placeholder="PASSWORD (8+ CHARS)" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}/>
                    <Button type="submit" variant="outline" size="sm">{isSignUp ? "Create account" : "Sign in"}</Button>
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
