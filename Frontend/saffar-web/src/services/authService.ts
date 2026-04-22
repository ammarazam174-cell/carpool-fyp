import api from "../api/axios";
import { LoginResponse } from "../types/auth";

export const loginUser = async (email: string, password: string) => {
    const res = await api.post<LoginResponse>("/auth/login", {
        email,
        password
    });

    return res.data;
};

export const registerUser = async (data: {
    fullName: string;
    email: string;
    phoneNumber: string;
    password: string;
    role: string;
}) => {
    const res = await api.post("/auth/register", data);
    return res.data;
};