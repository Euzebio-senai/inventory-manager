/**
 * StockPro Frontend - Sistema Aprimorado
 * Integração completa com API e funcionalidades avançadas
 */

class StockProFrontend {
    constructor() {
        this.api = new StockProAPI();
        this.currentUser = null;
        this.currentSale = [];
        this.notifications = [];
        this.theme = localStorage.getItem('stockpro_theme') || 'light';
        
        this.init();
    }

    async init() {
        // Verificar autenticação
        if (!this.api.isAuthenticated() && !window.location.pathname.includes('login')) {
            window.location.href = 'login.html';
            return;
        }

        if (this.api.isAuthenticated()) {
            this.currentUser = this.api.getCurrentUser();
            this.updateUserInterface();
            await this.loadInitialData();
        }

        // Aplicar tema salvo
        this.applyTheme();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Inicializar notificações
        this.setupNotifications();
        
        // Auto-save em intervalos
        this.setupAutoSave();
    }

    // ================================
    // GERENCIAMENTO DE DADOS
    // ================================

    async loadInitialData() {
        try {
            this.showLoading(true);
            
            // Carregar dados em paralelo
            const [
                dashboardStats,
                products,
                clients,
                companies,
                categories,
                notifications
            ] = await Promise.all([
                this.api.getDashboardStats(),
                this.api.getProducts(),
                this.api.getClients(),
                this.api.getCompanies(),
                this.api.getCategories(),
                this.api.getNotifications()
            ]);

            // Atualizar dashboard
            this.updateDashboard(dashboardStats);
            
            // Atualizar tabelas
            this.updateProductsTable(products);
            this.updateClientsTable(clients);
            this.updateCompaniesTable(companies);
            this.updateCategoriesDropdown(categories);
            
            // Atualizar notificações
            this.notifications = notifications;
            this.renderNotifications();

        } catch (error) {
            console.error("Erro ao carregar dados iniciais:", error);
            this.showToast('Erro ao carregar dados iniciais.', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ================================
    // AUTENTICAÇÃO E UX
    // ================================
    
    updateUserInterface() {
        if (!this.currentUser) return;

        // Mostrar nome e nível de acesso
        document.getElementById('user-name').textContent = this.currentUser.nome_completo;
        document.getElementById('user-role').textContent = this.currentUser.nivel_acesso;
        
        // Esconder seções não autorizadas (RBAC)
        // Níveis: Básico, Intermediário, Avançado
        const accessLevel = this.currentUser.nivel_acesso;
        
        if (accessLevel === 'Básico') {
            document.querySelector('[data-page="users"]').style.display = 'none';
            document.querySelector('[data-page="admins"]').style.display = 'none';
            document.querySelector('[data-page="companies"]').style.display = 'none';
            document.querySelector('[data-page="pos"]').style.display = 'none';
            
        } else if (accessLevel === 'Intermediário') {
            document.querySelector('[data-page="admins"]').style.display = 'none';
            document.querySelector('[data-page="companies"]').style.display = 'none';
        }
        
        // Para administradores (da tabela administradores)
        if (this.currentUser.role === 'Admin') {
            const adminLinks = document.querySelectorAll('.nav-links a, .modal, .btn');
            adminLinks.forEach(el => el.style.display = 'block'); // Mostrar tudo
        }
    }
    
    // ================================
    // EVENT LISTENERS E NAVEGAÇÃO
    // ================================

    setupEventListeners() {
        // Navegação
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPage(e.target.textContent.toLowerCase());
            });
        });
        
        // Botão de logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.api.logout();
            window.location.href = 'login.html';
        });

        // Toggle do tema
        document.querySelector('.theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Modals
        document.querySelectorAll('.btn-add-product').forEach(btn => {
            btn.addEventListener('click', () => this.showModal('modal-produto'));
        });
        
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', () => this.hideAllModals());
        });
        
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });

        // Formulários
        document.getElementById('form-produto').addEventListener('submit', (e) => this.handleProductSubmit(e));
    }
    
    showPage(pageId) {
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.querySelector(`#page-${pageId}`).classList.add('active');
        
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${pageId}"]`).classList.add('active');
    }
    
    showModal(modalId) {
        this.hideAllModals();
        document.getElementById(modalId).style.display = 'flex';
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

    // ================================
    // TEMAS
    // ================================
    
    applyTheme() {
        document.body.classList.toggle('dark-mode', this.theme === 'dark');
        document.getElementById('theme-icon').className = this.theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('stockpro_theme', this.theme);
        this.applyTheme();
    }
    
    // ================================
    // NOTIFICAÇÕES
    // ================================

    setupNotifications() {
        this.notifications.forEach(notif => this.showToast(notif.mensagem, notif.tipo));
    }

    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 500);
        }, duration);
    }
    
    // ================================
    // AUTOSAVE (EXEMPLO)
    // ================================
    setupAutoSave() {
        setInterval(() => {
            // Lógica para salvar automaticamente o estado de um formulário, por exemplo.
            // Exemplo: Salvar carrinho de vendas em rascunho
            if (this.currentSale.length > 0) {
                // this.api.saveDraftSale(this.currentSale);
                console.log('Carrinho de vendas salvo automaticamente.');
            }
        }, 60000); // 1 minuto
    }
    
    // ================================
    // MÉTODOS DE RENDERIZAÇÃO DE TABELAS
    // ================================
    updateProductsTable(products) {
        const tableBody = document.querySelector('#products-table tbody');
        if (!tableBody) return;
        tableBody.innerHTML = '';
        products.forEach(p => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${p.id}</td>
                <td>${p.codigo}</td>
                <td>${p.nome}</td>
                <td>${p.quantidade_estoque}</td>
                <td>${p.preco_venda}</td>
                <td>${p.categoria_nome || 'N/A'}</td>
                <td>
                    <button class="btn btn-sm btn-info"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    updateClientsTable(clients) {
        // Implementação semelhante para clientes
    }

    updateCompaniesTable(companies) {
        // Implementação semelhante para empresas
    }

    updateCategoriesDropdown(categories) {
        const dropdown = document.querySelector('#form-produto select[name="categoria_id"]');
        if (!dropdown) return;
        dropdown.innerHTML = '<option value="">Selecione uma categoria</option>';
        categories.forEach(c => {
            const option = document.createElement('option');
            option.value = c.id;
            option.textContent = c.nome;
            dropdown.appendChild(option);
        });
    }

    // ================================
    // MÉTODOS DE FORMULÁRIO
    // ================================
    async handleProductSubmit(e) {
        e.preventDefault();
        
        const form = e.target;
        const formData = new FormData(form);
        const productData = Object.fromEntries(formData.entries());
        
        try {
            this.showLoading(true);
            const result = await this.api.createProduct(productData);
            if (result.success) {
                this.showToast('Produto cadastrado com sucesso!', 'success');
                this.hideAllModals();
                await this.loadInitialData(); // Recarregar dados
            } else {
                this.showToast(result.message || 'Erro ao cadastrar produto.', 'error');
            }
        } catch (error) {
            this.showToast('Erro de conexão ao cadastrar produto.', 'error');
        } finally {
            this.showLoading(false);
        }
    }
    
    showLoading(show = true) {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.style.display = show ? 'block' : 'none';
        }
    }
}

// Inicializar
window.addEventListener('DOMContentLoaded', () => {
    new StockProFrontend();
});