/**
 * StockPro API - Sistema de Gerenciamento de Estoque
 * API completa em JavaScript para integração com o frontend
 * * @version 2.0
 * @author Sistema StockPro
 */

class StockProAPI {
    constructor(baseURL = 'http://localhost:3000/api') {
        this.baseURL = baseURL;
        this.token = localStorage.getItem('stockpro_token');
        this.user = JSON.parse(localStorage.getItem('stockpro_user') || 'null');
        
        // Configuração de interceptadores
        this.setupInterceptors();
    }

    // Configurar interceptadores para todas as requisições
    setupInterceptors() {
        // Interceptador para adicionar token automaticamente
        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
            if (url.includes(this.baseURL)) {
                options.headers = {
                    'Content-Type': 'application/json',
                    ...options.headers
                };
                
                if (this.token) {
                    options.headers['Authorization'] = `Bearer ${this.token}`;
                }
            }
            
            const response = await originalFetch(url, options);
            
            // Verificar se o token expirou
            if (response.status === 401) {
                this.logout();
                window.location.href = 'login.html';
            }
            
            return response;
        };
    }

    // Método auxiliar para fazer requisições
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await fetch(url, {
                method: 'GET',
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`Erro na requisição ${endpoint}:`, error);
            throw error;
        }
    }

    // ================================
    // AUTENTICAÇÃO
    // ================================
    
    async login(email, password, userType = 'user', companyId = null) {
        try {
            const response = await this.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    user_type: userType,
                    company_id: companyId
                })
            });

            if (response.success) {
                this.token = response.token;
                this.user = response.user;
                
                localStorage.setItem('stockpro_token', this.token);
                localStorage.setItem('stockpro_user', JSON.stringify(this.user));
                
                return {
                    success: true,
                    user: this.user,
                    message: 'Login realizado com sucesso!'
                };
            } else {
                return {
                    success: false,
                    message: response.message || 'Erro no login'
                };
            }
        } catch (error) {
            return {
                success: false,
                message: 'Erro de conexão. Tente novamente.'
            };
        }
    }

    async register(userData) {
        try {
            const response = await this.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            });

            return response;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Erro no cadastro'
            };
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('stockpro_token');
        localStorage.removeItem('stockpro_user');
        return {
            success: true,
            message: 'Logout realizado com sucesso!'
        };
    }

    getCurrentUser() {
        return this.user;
    }

    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // ================================
    // PRODUTOS
    // ================================
    
    async getProducts(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/products${queryParams ? `?${queryParams}` : ''}`;
        return await this.request(endpoint);
    }

    async getProduct(id) {
        return await this.request(`/products/${id}`);
    }

    async createProduct(productData) {
        return await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(id, productData) {
        return await this.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    async deleteProduct(id) {
        return await this.request(`/products/${id}`, {
            method: 'DELETE'
        });
    }

    async getLowStockProducts(empresa_id) {
        return await this.request(`/products/low-stock?empresa_id=${empresa_id}`);
    }

    // ================================
    // CLIENTES
    // ================================
    
    async getClients(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = `/clients${queryParams ? `?${queryParams}` : ''}`;
        return await this.request(endpoint);
    }

    async getClient(id) {
        return await this.request(`/clients/${id}`);
    }
    
    async createClient(clientData) {
        return await this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
    }

    async updateClient(id, clientData) {
        return await this.request(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
        });
    }

    async deleteClient(id) {
        return await this.request(`/clients/${id}`, {
            method: 'DELETE'
        });
    }

    // ================================
    // EMPRESAS
    // ================================
    
    async getCompanies() {
        return await this.request('/companies');
    }
    
    async createCompany(companyData) {
        return await this.request('/companies', {
            method: 'POST',
            body: JSON.stringify(companyData)
        });
    }
    
    async updateCompany(id, companyData) {
        return await this.request(`/companies/${id}`, {
            method: 'PUT',
            body: JSON.stringify(companyData)
        });
    }
    
    async deleteCompany(id) {
        return await this.request(`/companies/${id}`, {
            method: 'DELETE'
        });
    }

    // ================================
    // PDV (Pontos de Venda)
    // ================================
    
    async getPOS() {
        return await this.request('/pos');
    }

    // ================================
    // USUÁRIOS
    // ================================
    
    async getUsers() {
        return await this.request('/users');
    }
    
    // ================================
    // ADMINISTRADORES
    // ================================
    
    async getAdmins() {
        return await this.request('/admins');
    }

    // ================================
    // DASHBOARD
    // ================================
    
    async getDashboardStats() {
        return await this.request('/dashboard');
    }

    // ================================
    // VENDAS
    // ================================

    async createSale(saleData) {
        return await this.request('/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    }
}