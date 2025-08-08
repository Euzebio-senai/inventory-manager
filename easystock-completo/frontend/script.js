
function clearVendaForm() {
    const produtosContainer = document.querySelector('.produtos-venda');
    if (produtosContainer) {
        const items = produtosContainer.querySelectorAll('.produto-item');
        items.forEach((item, index) => {
            if (index > 0) item.remove(); // Remove todos exceto o primeiro
        });
        
        // Limpar primeiro item
        const firstItem = items[0];
        if (firstItem) {
            firstItem.querySelectorAll('select, input').forEach(input => {
                input.value = '';
            });
        }
    }
    
    document.getElementById('venda-subtotal').textContent = 'R$ 0,00';
    document.getElementById('venda-total').textContent = 'R$ 0,00';
    document.getElementById('venda-desconto').value = '0';
}

function adicionarProdutoVenda() {
    const container = document.querySelector('.produtos-venda');
    const items = container.querySelectorAll('.produto-item');
    const index = items.length;
    
    const newItem = document.createElement('div');
    newItem.className = 'produto-item';
    newItem.innerHTML = `
        <select class="form-control" onchange="carregarInfoProduto(this, ${index})">
            <option value="">Selecione um produto</option>
            ${produtos.map(p => `<option value="${p.id}">${p.codigo} - ${p.nome}</option>`).join('')}
        </select>
        <input type="number" class="form-control" placeholder="Qtd" min="1" onchange="calcularTotal()">
        <input type="number" class="form-control" placeholder="Preço" step="0.01" onchange="calcularTotal()" readonly>
        <input type="number" class="form-control" placeholder="Total" readonly>
        <button type="button" class="btn btn-danger btn-sm" onclick="removerProdutoVenda(${index})">
            <i class="fas fa-trash"></i>
        </button>
    `;
    
    container.appendChild(newItem);
}

function removerProdutoVenda(index) {
    const items = document.querySelectorAll('.produto-item');
    if (items.length > 1) {
        items[index].remove();
        calcularTotal();
    }
}

function carregarInfoProduto(select, index) {
    const produtoId = parseInt(select.value);
    const produto = produtos.find(p => p.id === produtoId);
    
    const item = select.closest('.produto-item');
    const precoInput = item.querySelector('input[placeholder="Preço"]');
    const qtdInput = item.querySelector('input[placeholder="Qtd"]');
    
    if (produto) {
        precoInput.value = produto.precoVenda.toFixed(2);
        qtdInput.max = produto.estoque;
        qtdInput.title = `Estoque disponível: ${produto.estoque}`;
    } else {
        precoInput.value = '';
        qtdInput.max = '';
        qtdInput.title = '';
    }
    
    calcularTotal();
}

function calcularTotal() {
    let subtotal = 0;
    
    document.querySelectorAll('.produto-item').forEach(item => {
        const qtd = parseFloat(item.querySelector('input[placeholder="Qtd"]').value) || 0;
        const preco = parseFloat(item.querySelector('input[placeholder="Preço"]').value) || 0;
        const total = qtd * preco;
        
        item.querySelector('input[placeholder="Total"]').value = total.toFixed(2);
        subtotal += total;
    });
    
    const desconto = parseFloat(document.getElementById('venda-desconto').value) || 0;
    const total = subtotal - desconto;
    
    document.getElementById('venda-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('venda-total').textContent = formatCurrency(total);
}

function salvarVenda(event) {
    event.preventDefault();
    
    const clienteId = parseInt(document.getElementById('venda-cliente').value);
    const dataVenda = document.getElementById('venda-data').value;
    const desconto = parseFloat(document.getElementById('venda-desconto').value) || 0;
    
    if (!clienteId) {
        showToast('Selecione um cliente!', 'error');
        return;
    }
    
    // Coletar itens
    const items = [];
    let subtotal = 0;
    let hasError = false;
    
    document.querySelectorAll('.produto-item').forEach(item => {
        const select = item.querySelector('select');
        const qtdInput = item.querySelector('input[placeholder="Qtd"]');
        const precoInput = item.querySelector('input[placeholder="Preço"]');
        
        const produtoId = parseInt(select.value);
        const quantidade = parseInt(qtdInput.value);
        const preco = parseFloat(precoInput.value);
        
        if (produtoId && quantidade && preco) {
            const produto = produtos.find(p => p.id === produtoId);
            
            if (quantidade > produto.estoque) {
                showToast(`Quantidade insuficiente para ${produto.nome}. Disponível: ${produto.estoque}`, 'error');
                hasError = true;
                return;
            }
            
            const total = quantidade * preco;
            items.push({
                produto: produtoId,
                quantidade,
                preco,
                total
            });
            subtotal += total;
        }
    });
    
    if (hasError) return;
    
    if (items.length === 0) {
        showToast('Adicione pelo menos um produto à venda!', 'error');
        return;
    }
    
    const total = subtotal - desconto;
    
    const novaVenda = {
        id: Date.now(),
        numero: `VEN-${String(vendas.length + 1).padStart(3, '0')}`,
        cliente: clienteId,
        data: new Date(dataVenda).toISOString(),
        status: 'finalizada',
        items,
        subtotal,
        desconto,
        total,
        usuario: 'Admin'
    };
    
    // Atualizar estoque dos produtos
    items.forEach(item => {
        const produto = produtos.find(p => p.id === item.produto);
        if (produto) {
            produto.estoque -= item.quantidade;
            
            // Registrar movimentação
            movimentacoes.push({
                id: Date.now() + Math.random(),
                produto: item.produto,
                tipo: 'saida',
                quantidade: item.quantidade,
                data: new Date().toISOString(),
                observacao: `Venda ${novaVenda.numero}`,
                usuario: 'Admin'
            });
        }
    });
    
    vendas.push(novaVenda);
    
    loadVendas();
    loadProdutos();
    loadMovimentacoes();
    updateDashboard();
    closeModal('venda-modal');
    showToast(`Venda ${novaVenda.numero} finalizada com sucesso!`, 'success');
}

// ===== CLIENTES =====
function loadClientes() {
    const tbody = document.getElementById('clientes-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    clientes.forEach(cliente => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cliente.nome}</td>
            <td>${cliente.email}</td>
            <td>${cliente.telefone}</td>
            <td>${cliente.documento}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="editarCliente(${cliente.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="excluirCliente(${cliente.id})">
                    <i class="fas fa-trash"></i> Excluir
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (clientes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum cliente cadastrado</td></tr>';
    }
}

function salvarCliente(event) {
    event.preventDefault();
    
    const nome = document.getElementById('cliente-nome').value;
    const email = document.getElementById('cliente-email').value;
    const telefone = document.getElementById('cliente-telefone').value;
    const documento = document.getElementById('cliente-documento').value;
    const tipo = document.getElementById('cliente-tipo').value;
    const endereco = document.getElementById('cliente-endereco').value;

    if (clientes.find(c => c.documento === documento)) {
        showToast('CPF/CNPJ já cadastrado!', 'error');
        return;
    }

    if (email && clientes.find(c => c.email === email)) {
        showToast('Email já cadastrado!', 'error');
        return;
    }

    const novoCliente = {
        id: Date.now(),
        nome,
        email,
        telefone,
        documento,
        tipo,
        endereco,
        dataCadastro: new Date().toISOString(),
        ativo: true
    };

    clientes.push(novoCliente);
    loadClientes();
    loadVendas(); // Atualizar selects
    closeModal('cliente-modal');
    showToast('Cliente cadastrado com sucesso!', 'success');
}

function excluirCliente(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;

    const vendasVinculadas = vendas.filter(v => v.cliente === id).length;
    if (vendasVinculadas > 0) {
        showToast(`Não é possível excluir. Existem ${vendasVinculadas} venda(s) vinculada(s) a este cliente.`, 'error');
        return;
    }

    if (confirm(`Deseja realmente excluir o cliente "${cliente.nome}"?`)) {
        clientes = clientes.filter(c => c.id !== id);
        loadClientes();
        showToast('Cliente excluído com sucesso!', 'success');
    }
}

// ===== BACKUP =====
function criarBackup() {
    const backupData = {
        versao: '1.0',
        dataBackup: new Date().toISOString(),
        dados: {
            produtos,
            categorias,
            fornecedores,
            movimentacoes,
            vendas,
            clientes,
            configuracoes
        }
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `easystock-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    showToast('Backup criado com sucesso!', 'success');
}

function validateBackupFile(input) {
    const file = input.files[0];
    const restoreBtn = document.getElementById('restore-btn');
    
    if (file && file.type === 'application/json') {
        restoreBtn.disabled = false;
        restoreBtn.textContent = `Restaurar ${file.name}`;
    } else {
        restoreBtn.disabled = true;
        restoreBtn.textContent = 'Restaurar Backup';
        if (file) {
            showToast('Arquivo inválido. Selecione um arquivo JSON.', 'error');
        }
    }
}

function restaurarBackup() {
    const fileInput = document.getElementById('backup-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Selecione um arquivo de backup!', 'error');
        return;
    }
    
    if (!confirm('ATENÇÃO: Esta ação irá substituir todos os dados atuais. Deseja continuar?')) {
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backupData = JSON.parse(e.target.result);
            
            if (!backupData.dados) {
                throw new Error('Formato de backup inválido');
            }
            
            // Restaurar dados
            produtos = backupData.dados.produtos || [];
            categorias = backupData.dados.categorias || [];
            fornecedores = backupData.dados.fornecedores || [];
            movimentacoes = backupData.dados.movimentacoes || [];
            vendas = backupData.dados.vendas || [];
            clientes = backupData.dados.clientes || [];
            configuracoes = { ...configuracoes, ...backupData.dados.configuracoes };
            
            // Recarregar interface
            loadAllData();
            updateDashboard();
            
            showToast(`Backup restaurado com sucesso! Data: ${formatDateTime(backupData.dataBackup)}`, 'success');
            
        } catch (error) {
            showToast('Erro ao restaurar backup: ' + error.message, 'error');
        }
    };
    
    reader.readAsText(file);
}

// ===== CONFIGURAÇÕES =====
function loadConfiguracoes() {
    document.getElementById('nome-empresa').value = configuracoes.nomeEmpresa || '';
    document.getElementById('cnpj-empresa').value = configuracoes.cnpjEmpresa || '';
    document.getElementById('email-empresa').value = configuracoes.emailEmpresa || '';
    document.getElementById('tema-padrao').value = configuracoes.temaPadrao || 'light';
}

function salvarConfiguracoes(event) {
    event.preventDefault();
    
    configuracoes.nomeEmpresa = document.getElementById('nome-empresa').value;
    configuracoes.cnpjEmpresa = document.getElementById('cnpj-empresa').value;
    configuracoes.emailEmpresa = document.getElementById('email-empresa').value;
    configuracoes.temaPadrao = document.getElementById('tema-padrao').value;
    
    // Aplicar tema se mudou
    if (currentTheme !== configuracoes.temaPadrao) {
        currentTheme = configuracoes.temaPadrao;
        applyTheme();
        localStorage.setItem('easystock-theme', currentTheme);
    }
    
    showToast('Configurações salvas com sucesso!', 'success');
}

// ===== NOTIFICAÇÕES =====
function checkNotifications() {
    notifications = [];
    
    // Verificar produtos com estoque baixo
    const produtosBaixo = produtos.filter(p => p.estoque <= p.estoqueMin);
    produtosBaixo.forEach(produto => {
        notifications.push({
            id: Date.now() + produto.id,
            tipo: 'warning',
            titulo: 'Estoque Baixo',
            mensagem: `${produto.nome} está com estoque baixo (${produto.estoque} unidades)`,
            data: new Date().toISOString()
        });
    });
    
    // Verificar produtos sem estoque
    const produtosSemEstoque = produtos.filter(p => p.estoque === 0);
    produtosSemEstoque.forEach(produto => {
        notifications.push({
            id: Date.now() + produto.id + 1000,
            tipo: 'error',
            titulo: 'Sem Estoque',
            mensagem: `${produto.nome} está sem estoque`,
            data: new Date().toISOString()
        });
    });
    
    updateNotificationBadge();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notification-count');
    if (badge) {
        badge.textContent = notifications.length;
        badge.style.display = notifications.length > 0 ? 'flex' : 'none';
    }
}

function toggleNotifications() {
    const dropdown = document.getElementById('notifications-dropdown');
    const list = document.getElementById('notifications-list');
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
    } else {
        dropdown.classList.add('show');
        
        // Atualizar lista de notificações
        if (notifications.length === 0) {
            list.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">Nenhuma notificação</p>';
        } else {
            list.innerHTML = notifications.map(notif => `
                <div style="padding: 1rem; border-bottom: 1px solid var(--border); display: flex; align-            descricao: 'Mouse gamer com LED RGB 6400 DPI',
            ativo: true
        }
    ];

    // Movimentações iniciais
    movimentacoes = [
        { 
            id: 1, 
            produto: 1, 
            tipo: 'entrada', 
            quantidade: 20, 
            data: new Date(Date.now() - 86400000).toISOString(), 
            observacao: 'Compra inicial - Fornecedor TechCorp',
            usuario: 'Admin'
        },
        { 
            id: 2, 
            produto: 2, 
            tipo: 'entrada', 
            quantidade: 8, 
            data: new Date(Date.now() - 172800000).toISOString(), 
            observacao: 'Reposição de estoque',
            usuario: 'Admin'
        },
        { 
            id: 3, 
            produto: 1, 
            tipo: 'saida', 
            quantidade: 5, 
            data: new Date(Date.now() - 43200000).toISOString(), 
            observacao: 'Venda - Cliente João Silva',
            usuario: 'Admin'
        }
    ];

    // Vendas iniciais
    vendas = [
        {
            id: 1,
            numero: 'VEN-001',
            cliente: 1,
            data: new Date().toISOString(),
            status: 'finalizada',
            items: [
                { produto: 1, quantidade: 2, preco: 1299.99, total: 2599.98 }
            ],
            subtotal: 2599.98,
            desconto: 0,
            total: 2599.98,
            usuario: 'Admin'
        },
        {
            id: 2,
            numero: 'VEN-002',
            cliente: 2,
            data: new Date(Date.now() - 86400000).toISOString(),
            status: 'finalizada',
            items: [
                { produto: 3, quantidade: 3, preco: 49.99, total: 149.97 },
                { produto: 5, quantidade: 1, preco: 89.99, total: 89.99 }
            ],
            subtotal: 239.96,
            desconto: 10.00,
            total: 229.96,
            usuario: 'Admin'
        }
    ];

    // Configurações iniciais
    configuracoes = {
        nomeEmpresa: 'EasyStock Empresa',
        cnpjEmpresa: '12.345.678/0001-90',
        emailEmpresa: 'contato@easystock.com',
        telefoneEmpresa: '(11) 99999-9999',
        enderecoEmpresa: 'Rua Principal, 123 - São Paulo, SP',
        temaPadrao: 'light',
        moedaPadrao: 'BRL',
        idiomaPadrao: 'pt-BR',
        notificacoes: true,
        backupAutomatico: false,
        frequenciaBackup: 'semanal'
    };
}

// ===== THEME MANAGEMENT =====
function loadTheme() {
    const savedTheme = localStorage.getItem('easystock-theme') || configuracoes.temaPadrao || 'light';
    currentTheme = savedTheme;
    applyTheme();
}

function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme();
    localStorage.setItem('easystock-theme', currentTheme);
    updateThemeIcon();
    showToast(`Tema ${currentTheme === 'light' ? 'claro' : 'escuro'} ativado`, 'info');
}

function applyTheme() {
    document.body.setAttribute('data-theme', currentTheme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.getElementById('theme-icon');
    if (icon) {
        icon.className = currentTheme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// ===== NAVIGATION =====
function showSection(sectionId) {
    // Remove active de todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active de todos os nav-items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Ativa a seção selecionada
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }
    
    // Ativa o nav-item correspondente
    event.target.classList.add('active');
    
    // Fecha sidebar em mobile
    closeSidebar();
    
    // Atualiza dados específicos da seção
    switch(sectionId) {
        case 'dashboard':
            updateDashboard();
            break;
        case 'produtos':
            loadProdutos();
            break;
        case 'categorias':
            loadCategorias();
            break;
        case 'fornecedores':
            loadFornecedores();
            break;
        case 'movimentacao':
            loadMovimentacoes();
            break;
        case 'vendas':
            loadVendas();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'configuracoes':
            loadConfiguracoes();
            break;
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// ===== MODAL MANAGEMENT =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus no primeiro input
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        const form = modal.querySelector('form');
        if (form) form.reset();
        
        // Limpar dados específicos
        if (modalId === 'venda-modal') {
            clearVendaForm();
        }
    }
}

// Fecha modal ao clicar fora
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        const modalId = e.target.id;
        closeModal(modalId);
    }
});

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="${icon}"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Remove toast após duração especificada
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            if (container.contains(toast)) {
                container.removeChild(toast);
            }
        }, 300);
    }, duration);
}

function getToastIcon(type) {
    switch(type) {
        case 'success': return 'fas fa-check-circle';
        case 'error': return 'fas fa-exclamation-circle';
        case 'warning': return 'fas fa-exclamation-triangle';
        case 'info': return 'fas fa-info-circle';
        default: return 'fas fa-info-circle';
    }
}

// ===== DASHBOARD =====
function updateDashboard() {
    const totalProdutos = produtos.length;
    const produtosEstoque = produtos.filter(p => p.estoque > 0).length;
    const produtosBaixo = produtos.filter(p => p.estoque <= p.estoqueMin).length;
    const valorTotal = produtos.reduce((total, p) => total + (p.estoque * p.precoVenda), 0);

    // Atualizar cards de estatísticas
    updateElement('total-produtos', totalProdutos);
    updateElement('produtos-estoque', produtosEstoque);
    updateElement('produtos-baixo', produtosBaixo);
    updateElement('valor-total', formatCurrency(valorTotal));

    // Atualizar tabelas
    updateProdutosBaixoEstoque();
    updateMovimentacoesRecentes();
    
    // Atualizar notificações
    updateNotificationBadge();
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function updateProdutosBaixoEstoque() {
    const tbody = document.getElementById('produtos-baixo-estoque');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const produtosBaixoEstoque = produtos.filter(p => p.estoque <= p.estoqueMin);
    
    if (produtosBaixoEstoque.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum produto com estoque baixo</td></tr>';
    } else {
        produtosBaixoEstoque.forEach(produto => {
            const status = produto.estoque === 0 ? 'Sem Estoque' : 'Estoque Baixo';
            const statusClass = produto.estoque === 0 ? 'badge-danger' : 'badge-warning';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${produto.nome}</td>
                <td class="${produto.estoque === 0 ? 'text-danger' : 'text-warning'}">${produto.estoque}</td>
                <td>${produto.estoqueMin}</td>
                <td><span class="badge ${statusClass}">${status}</span></td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="reabastecer(${produto.id})">
                        <i class="fas fa-plus"></i> Reabastecer
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

function updateMovimentacoesRecentes() {
    const tbody = document.getElementById('movimentacoes-recentes');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const movimentacoesRecentes = movimentacoes
        .sort((a, b) => new Date(b.data) - new Date(a.data))
        .slice(0, 5);
    
    if (movimentacoesRecentes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhuma movimentação recente</td></tr>';
    } else {
        movimentacoesRecentes.forEach(mov => {
            const produto = produtos.find(p => p.id === mov.produto);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(mov.data)}</td>
                <td>${produto ? produto.nome : 'Produto não encontrado'}</td>
                <td><span class="badge ${mov.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}">${mov.tipo.toUpperCase()}</span></td>
                <td>${mov.quantidade}</td>
            `;
            tbody.appendChild(row);
        });
    }
}

function atualizarDashboard() {
    showToast('Dashboard atualizado!', 'success');
    updateDashboard();
}

// ===== PRODUTOS =====
function loadAllData() {
    loadCategorias();
    loadFornecedores();
    loadProdutos();
    loadMovimentacoes();
    loadVendas();
    loadClientes();
}

function loadProdutos() {
    const tbody = document.getElementById('produtos-list');
    const selectMovimentacao = document.getElementById('movimentacao-produto');
    
    if (tbody) {
        tbody.innerHTML = '';
        
        produtos.forEach(produto => {
            const categoria = categorias.find(c => c.id === produto.categoria);
            const statusClass = produto.estoque <= produto.estoqueMin ? 
                (produto.estoque === 0 ? 'text-danger' : 'text-warning') : 'text-success';
            const statusText = produto.estoque <= produto.estoqueMin ? 
                (produto.estoque === 0 ? 'Sem Estoque' : 'Estoque Baixo') : 'Normal';
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" value="${produto.id}"></td>
                <td>${produto.codigo}</td>
                <td>${produto.nome}</td>
                <td>${categoria ? categoria.nome : 'N/A'}</td>
                <td class="${statusClass}">${produto.estoque}</td>
                <td>${formatCurrency(produto.precoVenda)}</td>
                <td><span class="badge ${statusClass.replace('text-', 'badge-')}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editarProduto(${produto.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="ajustarEstoque(${produto.id})" title="Ajustar Estoque">
                        <i class="fas fa-boxes"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirProduto(${produto.id})" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Atualizar select de produtos para movimentação
    if (selectMovimentacao) {
        selectMovimentacao.innerHTML = '<option value="">Selecione um produto</option>';
        produtos.forEach(produto => {
            const option = document.createElement('option');
            option.value = produto.id;
            option.textContent = `${produto.codigo} - ${produto.nome}`;
            selectMovimentacao.appendChild(option);
        });
    }

    // Atualizar filtro de categorias
    updateCategoriaFilter();
}

function updateCategoriaFilter() {
    const filterSelect = document.getElementById('filter-categoria');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Todas as categorias</option>';
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nome;
            filterSelect.appendChild(option);
        });
    }
}

function salvarProduto(event) {
    event.preventDefault();
    
    const codigo = document.getElementById('produto-codigo').value;
    const nome = document.getElementById('produto-nome').value;
    const categoria = parseInt(document.getElementById('produto-categoria').value);
    const fornecedor = parseInt(document.getElementById('produto-fornecedor').value) || null;
    const precoCompra = parseFloat(document.getElementById('produto-preco-compra').value);
    const precoVenda = parseFloat(document.getElementById('produto-preco-venda').value);
    const estoque = parseInt(document.getElementById('produto-estoque').value);
    const estoqueMin = parseInt(document.getElementById('produto-estoque-min').value);
    const descricao = document.getElementById('produto-descricao').value;

    // Validações
    if (produtos.find(p => p.codigo === codigo)) {
        showToast('Código do produto já existe!', 'error');
        return;
    }

    if (precoVenda <= precoCompra) {
        if (!confirm('O preço de venda é menor ou igual ao preço de compra. Deseja continuar?')) {
            return;
        }
    }

    const novoProduto = {
        id: Date.now(),
        codigo,
        nome,
        categoria,
        fornecedor,
        precoCompra,
        precoVenda,
        estoque,
        estoqueMin,
        descricao,
        ativo: true,
        dataCadastro: new Date().toISOString()
    };

    produtos.push(novoProduto);
    
    // Registrar movimentação inicial
    if (estoque > 0) {
        movimentacoes.push({
            id: Date.now() + 1,
            produto: novoProduto.id,
            tipo: 'entrada',
            quantidade: estoque,
            data: new Date().toISOString(),
            observacao: 'Estoque inicial do produto',
            usuario: 'Admin'
        });
    }
    
    loadProdutos();
    updateDashboard();
    closeModal('produto-modal');
    showToast('Produto cadastrado com sucesso!', 'success');
}

function excluirProduto(id) {
    const produto = produtos.find(p => p.id === id);
    if (!produto) return;

    if (confirm(`Deseja realmente excluir o produto "${produto.nome}"?`)) {
        produtos = produtos.filter(p => p.id !== id);
        
        // Remover movimentações relacionadas
        movimentacoes = movimentacoes.filter(m => m.produto !== id);
        
        loadProdutos();
        loadMovimentacoes();
        updateDashboard();
        showToast('Produto excluído com sucesso!', 'success');
    }
}

function reabastecer(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    const quantidade = prompt(`Quantidade para reabastecer "${produto.nome}":`, '10');
    if (quantidade && !isNaN(quantidade) && parseInt(quantidade) > 0) {
        const qtd = parseInt(quantidade);
        produto.estoque += qtd;
        
        // Registrar movimentação
        movimentacoes.push({
            id: Date.now(),
            produto: produtoId,
            tipo: 'entrada',
            quantidade: qtd,
            data: new Date().toISOString(),
            observacao: 'Reabastecimento manual',
            usuario: 'Admin'
        });
        
        updateDashboard();
        loadProdutos();
        loadMovimentacoes();
        showToast(`Produto "${produto.nome}" reabastecido com ${qtd} unidades!`, 'success');
    }
}

// ===== CATEGORIAS =====
function loadCategorias() {
    const tbody = document.getElementById('categorias-list');
    const select = document.getElementById('produto-categoria');
    
    if (tbody) {
        tbody.innerHTML = '';
        
        categorias.forEach(categoria => {
            const produtosCount = produtos.filter(p => p.categoria === categoria.id).length;
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${categoria.nome}</td>
                <td>${categoria.descricao}</td>
                <td>${produtosCount}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editarCategoria(${categoria.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirCategoria(${categoria.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Atualizar select de categorias
    if (select) {
        select.innerHTML = '<option value="">Selecione uma categoria</option>';
        categorias.forEach(categoria => {
            const option = document.createElement('option');
            option.value = categoria.id;
            option.textContent = categoria.nome;
            select.appendChild(option);
        });
    }
}

function salvarCategoria(event) {
    event.preventDefault();
    
    const nome = document.getElementById('categoria-nome').value;
    const descricao = document.getElementById('categoria-descricao').value;

    if (categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase())) {
        showToast('Categoria com esse nome já existe!', 'error');
        return;
    }

    const novaCategoria = {
        id: Date.now(),
        nome,
        descricao,
        dataCadastro: new Date().toISOString()
    };

    categorias.push(novaCategoria);
    loadCategorias();
    loadProdutos(); // Atualizar filtros
    closeModal('categoria-modal');
    showToast('Categoria cadastrada com sucesso!', 'success');
}

function excluirCategoria(id) {
    const categoria = categorias.find(c => c.id === id);
    if (!categoria) return;

    const produtosVinculados = produtos.filter(p => p.categoria === id).length;
    if (produtosVinculados > 0) {
        showToast(`Não é possível excluir. Existem ${produtosVinculados} produto(s) vinculado(s) a esta categoria.`, 'error');
        return;
    }

    if (confirm(`Deseja realmente excluir a categoria "${categoria.nome}"?`)) {
        categorias = categorias.filter(c => c.id !== id);
        loadCategorias();
        showToast('Categoria excluída com sucesso!', 'success');
    }
}

// ===== FORNECEDORES =====
function loadFornecedores() {
    const tbody = document.getElementById('fornecedores-list');
    const select = document.getElementById('produto-fornecedor');
    
    if (tbody) {
        tbody.innerHTML = '';
        
        fornecedores.forEach(fornecedor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fornecedor.nome}</td>
                <td>${fornecedor.email}</td>
                <td>${fornecedor.telefone}</td>
                <td>${fornecedor.cnpj}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="editarFornecedor(${fornecedor.id})">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirFornecedor(${fornecedor.id})">
                        <i class="fas fa-trash"></i> Excluir
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Atualizar select de fornecedores
    if (select) {
        select.innerHTML = '<option value="">Selecione um fornecedor</option>';
        fornecedores.forEach(fornecedor => {
            const option = document.createElement('option');
            option.value = fornecedor.id;
            option.textContent = fornecedor.nome;
            select.appendChild(option);
        });
    }
}

function salvarFornecedor(event) {
    event.preventDefault();
    
    const nome = document.getElementById('fornecedor-nome').value;
    const email = document.getElementById('fornecedor-email').value;
    const telefone = document.getElementById('fornecedor-telefone').value;
    const cnpj = document.getElementById('fornecedor-cnpj').value;
    const endereco = document.getElementById('fornecedor-endereco').value;

    if (fornecedores.find(f => f.cnpj === cnpj)) {
        showToast('CNPJ já cadastrado!', 'error');
        return;
    }

    if (fornecedores.find(f => f.email === email)) {
        showToast('Email já cadastrado!', 'error');
        return;
    }

    const novoFornecedor = {
        id: Date.now(),
        nome,
        email,
        telefone,
        cnpj,
        endereco,
        dataCadastro: new Date().toISOString(),
        ativo: true
    };

    fornecedores.push(novoFornecedor);
    loadFornecedores();
    loadProdutos(); // Atualizar selects
    closeModal('fornecedor-modal');
    showToast('Fornecedor cadastrado com sucesso!', 'success');
}

function excluirFornecedor(id) {
    const fornecedor = fornecedores.find(f => f.id === id);
    if (!fornecedor) return;

    const produtosVinculados = produtos.filter(p => p.fornecedor === id).length;
    if (produtosVinculados > 0) {
        showToast(`Não é possível excluir. Existem ${produtosVinculados} produto(s) vinculado(s) a este fornecedor.`, 'error');
        return;
    }

    if (confirm(`Deseja realmente excluir o fornecedor "${fornecedor.nome}"?`)) {
        fornecedores = fornecedores.filter(f => f.id !== id);
        loadFornecedores();
        showToast('Fornecedor excluído com sucesso!', 'success');
    }
}

// ===== MOVIMENTAÇÕES =====
function loadMovimentacoes() {
    const tbody = document.getElementById('movimentacao-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    const movimentacoesOrdenadas = movimentacoes
        .sort((a, b) => new Date(b.data) - new Date(a.data));

    movimentacoesOrdenadas.forEach(mov => {
        const produto = produtos.find(p => p.id === mov.produto);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDateTime(mov.data)}</td>
            <td>${produto ? produto.nome : 'Produto não encontrado'}</td>
            <td><span class="badge ${mov.tipo === 'entrada' ? 'badge-success' : 'badge-danger'}">${mov.tipo.toUpperCase()}</span></td>
            <td>${mov.quantidade}</td>
            <td>${mov.observacao || '-'}</td>
        `;
        tbody.appendChild(row);
    });

    if (movimentacoes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhuma movimentação registrada</td></tr>';
    }
}

function salvarMovimentacao(event) {
    event.preventDefault();
    
    const produtoId = parseInt(document.getElementById('movimentacao-produto').value);
    const tipo = document.getElementById('movimentacao-tipo').value;
    const quantidade = parseInt(document.getElementById('movimentacao-quantidade').value);
    const observacao = document.getElementById('movimentacao-observacao').value;

    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
        showToast('Produto não encontrado!', 'error');
        return;
    }

    // Validar saída
    if (tipo === 'saida' && quantidade > produto.estoque) {
        showToast(`Quantidade insuficiente em estoque. Disponível: ${produto.estoque}`, 'error');
        return;
    }

    const novaMovimentacao = {
        id: Date.now(),
        produto: produtoId,
        tipo,
        quantidade,
        data: new Date().toISOString(),
        observacao,
        usuario: 'Admin'
    };

    movimentacoes.push(novaMovimentacao);

    // Atualizar estoque do produto
    if (tipo === 'entrada') {
        produto.estoque += quantidade;
    } else {
        produto.estoque -= quantidade;
    }

    loadMovimentacoes();
    loadProdutos();
    updateDashboard();
    closeModal('movimentacao-modal');
    showToast('Movimentação registrada com sucesso!', 'success');
}

// ===== VENDAS =====
function loadVendas() {
    const tbody = document.getElementById('vendas-list');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    vendas.forEach(venda => {
        const cliente = clientes.find(c => c.id === venda.cliente);
        const statusClass = venda.status === 'finalizada' ? 'badge-success' : 
                          venda.status === 'pendente' ? 'badge-warning' : 'badge-danger';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${venda.numero}</td>
            <td>${formatDateTime(venda.data)}</td>
            <td>${cliente ? cliente.nome : 'Cliente não encontrado'}</td>
            <td>${formatCurrency(venda.total)}</td>
            <td><span class="badge ${statusClass}">${venda.status.toUpperCase()}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="visualizarVenda(${venda.id})">
                    <i class="fas fa-eye"></i> Ver
                </button>
                <button class="btn btn-sm btn-warning" onclick="imprimirVenda(${venda.id})">
                    <i class="fas fa-print"></i> Imprimir
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    if (vendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Nenhuma venda registrada</td></tr>';
    }

    // Carregar clientes no select
    loadClientesSelect();
}

function loadClientesSelect() {
    const select = document.getElementById('venda-cliente');
    if (select) {
        select.innerHTML = '<option value="">Selecione um cliente</option>';
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            select.appendChild(option);
        });// ===== GLOBAL VARIABLES =====
let produtos = [];
let categorias = [];
let fornecedores = [];
let movimentacoes = [];
let vendas = [];
let clientes = [];
let configuracoes = {};
let currentTheme = 'light';
let notifications = [];

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    loadTheme();
    updateDashboard();
    loadAllData();
    checkNotifications();
    
    // Set current date for date inputs
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) input.value = today;
    });
});

// ===== DATA INITIALIZATION =====
function initializeData() {
    // Categorias iniciais
    categorias = [
        { id: 1, nome: 'Eletrônicos', descricao: 'Produtos eletrônicos e tecnologia' },
        { id: 2, nome: 'Roupas', descricao: 'Vestuário e acessórios' },
        { id: 3, nome: 'Casa e Jardim', descricao: 'Produtos para casa e jardim' },
        { id: 4, nome: 'Livros', descricao: 'Livros e materiais educativos' }
    ];

    // Fornecedores iniciais
    fornecedores = [
        { 
            id: 1, 
            nome: 'TechCorp Solutions', 
            email: 'vendas@techcorp.com', 
            telefone: '(11) 99999-0001', 
            cnpj: '11.111.111/0001-11',
            endereco: 'Av. Paulista, 1000 - São Paulo, SP'
        },
        { 
            id: 2, 
            nome: 'ModaStyle Ltda', 
            email: 'contato@modastyle.com', 
            telefone: '(11) 99999-0002', 
            cnpj: '22.222.222/0001-22',
            endereco: 'Rua Augusta, 500 - São Paulo, SP'
        },
        { 
            id: 3, 
            nome: 'Casa & Lar Distribuidora', 
            email: 'pedidos@casalar.com', 
            telefone: '(11) 99999-0003', 
            cnpj: '33.333.333/0001-33',
            endereco: 'Rua das Flores, 200 - São Paulo, SP'
        }
    ];

    // Clientes iniciais
    clientes = [
        {
            id: 1,
            nome: 'João Silva',
            email: 'joao@email.com',
            telefone: '(11) 98888-0001',
            documento: '123.456.789-00',
            tipo: 'fisica',
            endereco: 'Rua A, 100 - São Paulo, SP'
        },
        {
            id: 2,
            nome: 'Maria Santos',
            email: 'maria@email.com',
            telefone: '(11) 98888-0002',
            documento: '987.654.321-00',
            tipo: 'fisica',
            endereco: 'Rua B, 200 - São Paulo, SP'
        },
        {
            id: 3,
            nome: 'Empresa ABC Ltda',
            email: 'contato@empresaabc.com',
            telefone: '(11) 98888-0003',
            documento: '12.345.678/0001-90',
            tipo: 'juridica',
            endereco: 'Av. Principal, 1000 - São Paulo, SP'
        }
    ];

    // Produtos iniciais
    produtos = [
        { 
            id: 1, 
            codigo: 'PROD001', 
            nome: 'Smartphone Samsung Galaxy A54', 
            categoria: 1, 
            fornecedor: 1,
            precoCompra: 800.00, 
            precoVenda: 1299.99, 
            estoque: 15, 
            estoqueMin: 5, 
            descricao: 'Smartphone Android com 128GB',
            ativo: true
        },
        { 
            id: 2, 
            codigo: 'PROD002', 
            nome: 'Notebook Dell Inspiron', 
            categoria: 1, 
            fornecedor: 1,
            precoCompra: 2000.00, 
            precoVenda: 2899.99, 
            estoque: 3, 
            estoqueMin: 5, 
            descricao: 'Notebook i5 8GB RAM 256GB SSD',
            ativo: true
        },
        { 
            id: 3, 
            codigo: 'PROD003', 
            nome: 'Camiseta Polo', 
            categoria: 2, 
            fornecedor: 2,
            precoCompra: 25.00, 
            precoVenda: 49.99, 
            estoque: 50, 
            estoqueMin: 10, 
            descricao: 'Camiseta polo masculina 100% algodão',
            ativo: true
        },
        { 
            id: 4, 
            codigo: 'PROD004', 
            nome: 'Jogo de Panelas', 
            categoria: 3, 
            fornecedor: 3,
            precoCompra: 80.00, 
            precoVenda: 149.99, 
            estoque: 2, 
            estoqueMin: 5, 
            descricao: 'Jogo de panelas antiaderente 5 peças',
            ativo: true
        },
        { 
            id: 5, 
            codigo: 'PROD005', 
            nome: 'Mouse Gamer RGB', 
            categoria: 1, 
            fornecedor: 1,
            precoCompra: 45.00, 
            precoVenda: 89.99, 
            estoque: 25, 
            estoqueMin: 8, 
            descricao: 'Mouse g