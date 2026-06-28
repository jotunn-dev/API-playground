import { axiosInstance } from '../../shared/api/axiosInstance'

export interface RegisterRequest {
  email: string
  password: string
}

export interface RegisterResponse {
  userId: number
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  expiresAt: string
}

export async function registerUser(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await axiosInstance.post<RegisterResponse>('/auth/register', data)
  return response.data
}

export async function loginUser(data: LoginRequest): Promise<LoginResponse> {
  const response = await axiosInstance.post<LoginResponse>('/auth/login', data)
  return response.data
}
