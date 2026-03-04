import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            api.get("/me")
                .then((res) => {
                    setUser(res.data);
                    setLoading(false);
                })
                .catch(() => {
                    localStorage.removeItem("token");
                    setToken(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = async (email, password) => {
        const formData = new FormData();
        formData.append("username", email);
        formData.append("password", password);

        try {
            const res = await api.post("/auth/login", formData);
            localStorage.setItem("token", res.data.access_token);
            setToken(res.data.access_token);
            await api.get("/me").then(res => setUser(res.data));
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.detail || "Login failed" };
        }
    };

    const register = async (email, password) => {
        try {
            await api.post("/auth/register", { email, password });
            return { success: true };
        } catch (err) {
            return { success: false, error: err.response?.data?.detail || "Registration failed" };
        }
    }

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
