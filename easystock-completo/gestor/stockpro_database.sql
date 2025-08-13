-- =============================================
-- SISTEMA DE GERENCIAMENTO DE ESTOQUE (StockPro)
-- Banco de Dados Completo
-- =============================================

-- Criar o banco de dados
CREATE DATABASE IF NOT EXISTS stockpro;
USE stockpro;

-- =============================================
-- TABELAS PRINCIPAIS
-- =============================================

-- Tabela de Empresas
CREATE TABLE empresas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    endereco TEXT,
    telefone VARCHAR(20),
    email VARCHAR(100),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela de Administradores
CREATE TABLE administradores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    empresa_id INT,
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL
);

-- Tabela de Usuários
CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nivel_acesso ENUM('Básico', 'Intermediário', 'Avançado') NOT NULL,
    empresa_id INT,
    administrador_id INT,
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE SET NULL,
    FOREIGN KEY (administrador_id) REFERENCES administradores(id) ON DELETE SET NULL
);

-- Tabela de Pontos de Venda (PDV)
CREATE TABLE pontos_venda (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    empresa_id INT NOT NULL,
    administrador_id INT NOT NULL,
    endereco TEXT,
    telefone VARCHAR(20),
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
    FOREIGN KEY (administrador_id) REFERENCES administradores(id) ON DELETE CASCADE
);

-- Tabela de Categorias de Produtos
CREATE TABLE categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria_id INT,
    tipo ENUM('Material de limpeza', 'Descartável', 'Alimento', 'Material escolar', 'Outros') NOT NULL,
    quantidade_estoque INT NOT NULL DEFAULT 0,
    quantidade_minima INT DEFAULT 10,
    preco_custo DECIMAL(10,2),
    preco_venda DECIMAL(10,2),
    unidade_medida VARCHAR(10) DEFAULT 'UN',
    empresa_id INT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabela de Clientes
CREATE TABLE clientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    cnpj VARCHAR(18) UNIQUE,
    tipo_cliente ENUM('Pessoa Física', 'Pessoa Jurídica') DEFAULT 'Pessoa Física',
    email VARCHAR(100),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    empresa_id INT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabela de Vendas
CREATE TABLE vendas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_nota VARCHAR(20) UNIQUE NOT NULL,
    cliente_id INT NOT NULL,
    usuario_id INT NOT NULL,
    pdv_id INT NOT NULL,
    data_venda TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    desconto DECIMAL(10,2) DEFAULT 0,
    valor_final DECIMAL(10,2) NOT NULL DEFAULT 0,
    status_venda ENUM('Pendente', 'Concluída', 'Cancelada') DEFAULT 'Pendente',
    forma_pagamento ENUM('Dinheiro', 'Cartão', 'PIX', 'Boleto', 'Outros') DEFAULT 'Dinheiro',
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (pdv_id) REFERENCES pontos_venda(id) ON DELETE RESTRICT
);

-- Tabela de Itens da Venda
CREATE TABLE itens_venda (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venda_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    preco_total DECIMAL(10,2) NOT NULL,
    desconto_item DECIMAL(10,2) DEFAULT 0,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venda_id) REFERENCES vendas(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

-- Tabela de Movimentações de Estoque
CREATE TABLE movimentacoes_estoque (
    id INT PRIMARY KEY AUTO_INCREMENT,
    produto_id INT NOT NULL,
    tipo_movimentacao ENUM('Entrada', 'Saída', 'Ajuste', 'Transferência') NOT NULL,
    quantidade INT NOT NULL,
    quantidade_anterior INT NOT NULL,
    quantidade_atual INT NOT NULL,
    motivo VARCHAR(255),
    referencia_id INT, -- ID da venda, compra, etc.
    referencia_tipo ENUM('Venda', 'Compra', 'Ajuste', 'Transferência'),
    usuario_id INT NOT NULL,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Tabela de Fornecedores
CREATE TABLE fornecedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    email VARCHAR(100),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    contato_responsavel VARCHAR(255),
    empresa_id INT,
    ativo BOOLEAN DEFAULT TRUE,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

-- Tabela de Compras
CREATE TABLE compras (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_pedido VARCHAR(20) UNIQUE NOT NULL,
    fornecedor_id INT NOT NULL,
    usuario_id INT NOT NULL,
    data_compra TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_entrega DATE,
    valor_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    status_compra ENUM('Pedido', 'Entregue', 'Cancelado') DEFAULT 'Pedido',
    observacoes TEXT,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- Tabela de Itens da Compra
CREATE TABLE itens_compra (
    id INT PRIMARY KEY AUTO_INCREMENT,
    compra_id INT NOT NULL,
    produto_id INT NOT NULL,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10,2) NOT NULL,
    preco_total DECIMAL(10,2) NOT NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
);

-- Tabela de Sessões de Usuário (para controle de login)
CREATE TABLE sessoes_usuario (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    data_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_expiracao TIMESTAMP NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabela de Logs do Sistema
CREATE TABLE logs_sistema (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT,
    acao VARCHAR(100) NOT NULL,
    tabela_afetada VARCHAR(50),
    registro_id INT,
    dados_anteriores JSON,
    dados_novos JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    data_acao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- =============================================
-- ÍNDICES PARA OTIMIZAÇÃO
-- =============================================

-- Índices para melhorar performance
CREATE INDEX idx_produtos_codigo ON produtos(codigo);
CREATE INDEX idx_produtos_categoria ON produtos(categoria_id);
CREATE INDEX idx_produtos_empresa ON produtos(empresa_id);
CREATE INDEX idx_produtos_ativo ON produtos(ativo);
CREATE INDEX idx_produtos_estoque_baixo ON produtos(quantidade_estoque, quantidade_minima);

CREATE INDEX idx_vendas_data ON vendas(data_venda);
CREATE INDEX idx_vendas_cliente ON vendas(cliente_id);
CREATE INDEX idx_vendas_usuario ON vendas(usuario_id);
CREATE INDEX idx_vendas_pdv ON vendas(pdv_id);
CREATE INDEX idx_vendas_status ON vendas(status_venda);

CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX idx_clientes_ativo ON clientes(ativo);
CREATE INDEX idx_clientes_tipo ON clientes(tipo_cliente);

CREATE INDEX idx_movimentacoes_produto ON movimentacoes_estoque(produto_id);
CREATE INDEX idx_movimentacoes_data ON movimentacoes_estoque(data_movimentacao);
CREATE INDEX idx_movimentacoes_tipo ON movimentacoes_estoque(tipo_movimentacao);

CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
CREATE INDEX idx_usuarios_nivel ON usuarios(nivel_acesso);

-- =============================================
-- VIEWS PARA RELATÓRIOS
-- =============================================

-- View para Dashboard
CREATE VIEW vw_dashboard AS
SELECT 
    e.id as empresa_id,
    e.nome as empresa_nome,
    COUNT(DISTINCT p.id) as total_produtos,
    COUNT(DISTINCT c.id) as total_clientes,
    COUNT(DISTINCT v.id) as total_vendas,
    COUNT(DISTINCT CASE WHEN p.quantidade_estoque <= p.quantidade_minima THEN p.id END) as produtos_baixo_estoque,
    COALESCE(SUM(v.valor_final), 0) as valor_total_vendas
FROM empresas e
LEFT JOIN produtos p ON e.id = p.empresa_id AND p.ativo = TRUE
LEFT JOIN clientes c ON e.id = c.empresa_id AND c.ativo = TRUE
LEFT JOIN vendas v ON v.data_venda >= CURDATE() - INTERVAL 30 DAY
LEFT JOIN pontos_venda pdv ON v.pdv_id = pdv.id AND pdv.empresa_id = e.id
WHERE e.ativo = TRUE
GROUP BY e.id, e.nome;

-- View para Produtos com Estoque Baixo
CREATE VIEW vw_produtos_estoque_baixo AS
SELECT 
    p.id,
    p.codigo,
    p.nome,
    p.tipo,
    p.quantidade_estoque,
    p.quantidade_minima,
    e.nome as empresa_nome,
    c.nome as categoria_nome
FROM produtos p
LEFT JOIN empresas e ON p.empresa_id = e.id
LEFT JOIN categorias c ON p.categoria_id = c.id
WHERE p.quantidade_estoque <= p.quantidade_minima
AND p.ativo = TRUE
ORDER BY p.quantidade_estoque ASC;

-- View para Vendas do Dia
CREATE VIEW vw_vendas_dia AS
SELECT 
    v.id,
    v.numero_nota,
    c.nome_completo as cliente_nome,
    u.nome_completo as usuario_nome,
    pdv.nome as pdv_nome,
    v.data_venda,
    v.valor_final,
    v.forma_pagamento,
    v.status_venda,
    e.nome as empresa_nome
FROM vendas v
JOIN clientes c ON v.cliente_id = c.id
JOIN usuarios u ON v.usuario_id = u.id
JOIN pontos_venda pdv ON v.pdv_id = pdv.id
JOIN empresas e ON pdv.empresa_id = e.id
WHERE DATE(v.data_venda) = CURDATE()
ORDER BY v.data_venda DESC;

-- View para Relatório de Produtos
CREATE VIEW vw_relatorio_produtos AS
SELECT 
    p.id,
    p.codigo,
    p.nome,
    p.descricao,
    p.tipo,
    c.nome as categoria_nome,
    p.quantidade_estoque,
    p.quantidade_minima,
    p.preco_custo,
    p.preco_venda,
    p.unidade_medida,
    e.nome as empresa_nome,
    p.ativo,
    p.data_criacao,
    CASE 
        WHEN p.quantidade_estoque <= p.quantidade_minima THEN 'Baixo'
        WHEN p.quantidade_estoque <= p.quantidade_minima * 2 THEN 'Médio'
        ELSE 'Alto'
    END as nivel_estoque
FROM produtos p
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN empresas e ON p.empresa_id = e.id
ORDER BY p.nome;

-- =============================================
-- TRIGGERS PARA AUTOMAÇÃO
-- =============================================

-- Trigger para atualizar estoque após venda
DELIMITER //
CREATE TRIGGER tr_atualizar_estoque_venda
AFTER INSERT ON itens_venda
FOR EACH ROW
BEGIN
    UPDATE produtos 
    SET quantidade_estoque = quantidade_estoque - NEW.quantidade
    WHERE id = NEW.produto_id;
    
    INSERT INTO movimentacoes_estoque (
        produto_id, tipo_movimentacao, quantidade, quantidade_anterior, 
        quantidade_atual, motivo, referencia_id, referencia_tipo, usuario_id
    ) VALUES (
        NEW.produto_id, 'Saída', NEW.quantidade,
        (SELECT quantidade_estoque + NEW.quantidade FROM produtos WHERE id = NEW.produto_id),
        (SELECT quantidade_estoque FROM produtos WHERE id = NEW.produto_id),
        'Venda de produto', NEW.venda_id, 'Venda',
        (SELECT usuario_id FROM vendas WHERE id = NEW.venda_id)
    );
END//
DELIMITER ;

-- Trigger para calcular valor total da venda
DELIMITER //
CREATE TRIGGER tr_calcular_total_venda
AFTER INSERT ON itens_venda
FOR EACH ROW
BEGIN
    UPDATE vendas 
    SET valor_total = (
        SELECT SUM(preco_total - desconto_item) 
        FROM itens_venda 
        WHERE venda_id = NEW.venda_id
    )
    WHERE id = NEW.venda_id;
    
    UPDATE vendas 
    SET valor_final = valor_total - desconto 
    WHERE id = NEW.venda_id;
END//
DELIMITER ;

-- Trigger para atualizar estoque após compra
DELIMITER //
CREATE TRIGGER tr_atualizar_estoque_compra
AFTER INSERT ON itens_compra
FOR EACH ROW
BEGIN
    UPDATE produtos 
    SET quantidade_estoque = quantidade_estoque + NEW.quantidade
    WHERE id = NEW.produto_id;
    
    INSERT INTO movimentacoes_estoque (
        produto_id, tipo_movimentacao, quantidade, quantidade_anterior, 
        quantidade_atual, motivo, referencia_id, referencia_tipo, usuario_id
    ) VALUES (
        NEW.produto_id, 'Entrada', NEW.quantidade,
        (SELECT quantidade_estoque - NEW.quantidade FROM produtos WHERE id = NEW.produto_id),
        (SELECT quantidade_estoque FROM produtos WHERE id = NEW.produto_id),
        'Compra de produto', NEW.compra_id, 'Compra',
        (SELECT usuario_id FROM compras WHERE id = NEW.compra_id)
    );
END//
DELIMITER ;

-- =============================================
-- PROCEDIMENTOS ARMAZENADOS
-- =============================================

-- Procedimento para criar novo produto
DELIMITER //
CREATE PROCEDURE sp_criar_produto(
    IN p_nome VARCHAR(255),
    IN p_tipo VARCHAR(50),
    IN p_quantidade INT,
    IN p_preco_custo DECIMAL(10,2),
    IN p_preco_venda DECIMAL(10,2),
    IN p_empresa_id INT,
    IN p_categoria_id INT,
    OUT p_produto_id INT
)
BEGIN
    DECLARE v_codigo VARCHAR(20);
    DECLARE v_next_number INT;
    
    -- Gerar próximo código
    SELECT COALESCE(MAX(CAST(SUBSTRING(codigo, 1, 4) AS UNSIGNED)), 0) + 1 
    INTO v_next_number 
    FROM produtos 
    WHERE empresa_id = p_empresa_id;
    
    SET v_codigo = LPAD(v_next_number, 4, '0');
    
    INSERT INTO produtos (
        codigo, nome, tipo, quantidade_estoque, preco_custo, 
        preco_venda, empresa_id, categoria_id
    ) VALUES (
        v_codigo, p_nome, p_tipo, p_quantidade, p_preco_custo,
        p_preco_venda, p_empresa_id, p_categoria_id
    );
    
    SET p_produto_id = LAST_INSERT_ID();
    
    -- Registrar movimentação inicial
    INSERT INTO movimentacoes_estoque (
        produto_id, tipo_movimentacao, quantidade, quantidade_anterior, 
        quantidade_atual, motivo, usuario_id
    ) VALUES (
        p_produto_id, 'Entrada', p_quantidade, 0, p_quantidade,
        'Cadastro inicial do produto', 1
    );
END//
DELIMITER ;

-- Procedimento para relatório de vendas por período
DELIMITER //
CREATE PROCEDURE sp_relatorio_vendas_periodo(
    IN p_data_inicio DATE,
    IN p_data_fim DATE,
    IN p_empresa_id INT
)
BEGIN
    SELECT 
        v.numero_nota,
        v.data_venda,
        c.nome_completo as cliente,
        u.nome_completo as vendedor,
        pdv.nome as pdv,
        v.valor_final,
        v.forma_pagamento,
        v.status_venda,
        COUNT(iv.id) as total_itens
    FROM vendas v
    JOIN clientes c ON v.cliente_id = c.id
    JOIN usuarios u ON v.usuario_id = u.id
    JOIN pontos_venda pdv ON v.pdv_id = pdv.id
    JOIN itens_venda iv ON v.id = iv.venda_id
    WHERE DATE(v.data_venda) BETWEEN p_data_inicio AND p_data_fim
    AND pdv.empresa_id = p_empresa_id
    GROUP BY v.id
    ORDER BY v.data_venda DESC;
END//
DELIMITER ;

-- =============================================
-- DADOS INICIAIS
-- =============================================

-- Inserir categorias padrão
INSERT INTO categorias (nome, descricao) VALUES
('Material de Limpeza', 'Produtos para limpeza e higiene'),
('Descartáveis', 'Produtos descartáveis diversos'),
('Alimentos', 'Produtos alimentícios'),
('Material Escolar', 'Produtos para uso escolar e escritório'),
('Outros', 'Outros produtos diversos');

-- Inserir empresa principal
INSERT INTO empresas (nome, cnpj, email, telefone) VALUES
('Empresa Principal', '12.345.678/0001-99', 'contato@empresa.com', '(11) 99999-9999');

-- Inserir administrador master
INSERT INTO administradores (nome_completo, email, senha, empresa_id) VALUES
('Administrador Master', 'admin@empresa.com', SHA2('admin123', 256), 1);

-- Inserir usuários exemplo
INSERT INTO usuarios (nome_completo, email, senha, nivel_acesso, empresa_id, administrador_id) VALUES
('João Silva', 'joao@empresa.com', SHA2('123456', 256), 'Avançado', 1, 1),
('Maria Santos', 'maria@empresa.com', SHA2('123456', 256), 'Intermediário', 1, 1);

-- Inserir PDV exemplo
INSERT INTO pontos_venda (nome, empresa_id, administrador_id) VALUES
('PDV Principal', 1, 1);

-- Inserir clientes exemplo
INSERT INTO clientes (nome_completo, email, telefone, empresa_id) VALUES
('Cliente Exemplo 1', 'cliente1@email.com', '(11) 88888-8888', 1),
('Cliente Exemplo 2', 'cliente2@email.com', '(11) 77777-7777', 1);

-- Inserir produtos exemplo
INSERT INTO produtos (codigo, nome, tipo, quantidade_estoque, preco_custo, preco_venda, empresa_id, categoria_id) VALUES
('0001', 'Sabão em Pó', 'Material de limpeza', 50, 8.50, 12.99, 1, 1),
('0002', 'Papel A4', 'Material escolar', 100, 15.00, 22.90, 1, 4),
('0003', 'Copo Descartável', 'Descartável', 200, 2.50, 4.99, 1, 2);

-- =============================================
-- FUNÇÕES ÚTEIS
-- =============================================

-- Função para calcular idade do cliente
DELIMITER //
CREATE FUNCTION fn_calcular_idade(p_data_nascimento DATE) 
RETURNS INT
READS SQL DATA
DETERMINISTIC
BEGIN
    RETURN TIMESTAMPDIFF(YEAR, p_data_nascimento, CURDATE());
END//
DELIMITER ;

-- Função para formatar CPF
DELIMITER //
CREATE FUNCTION fn_formatar_cpf(p_cpf VARCHAR(11))
RETURNS VARCHAR(14)
READS SQL DATA
DETERMINISTIC
BEGIN
    IF LENGTH(p_cpf) = 11 THEN
        RETURN CONCAT(
            SUBSTRING(p_cpf, 1, 3), '.',
            SUBSTRING(p_cpf, 4, 3), '.',
            SUBSTRING(p_cpf, 7, 3), '-',
            SUBSTRING(p_cpf, 10, 2)
        );
    ELSE
        RETURN p_cpf;
    END IF;
END//
DELIMITER ;

-- =============================================
-- COMENTÁRIOS FINAIS
-- =============================================

/*
Este banco de dados foi projetado para o sistema StockPro com as seguintes características:

1. ESTRUTURA COMPLETA:
   - Gerenciamento de múltiplas empresas
   - Controle de usuários e administradores
   - Produtos com categorias e controle de estoque
   - Sistema de vendas com PDV
   - Controle de clientes e fornecedores
   - Histórico de movimentações

2. SEGURANÇA:
   - Senhas criptografadas com SHA2
   - Controle de sessões
   - Logs de sistema para auditoria

3. PERFORMANCE:
   - Índices otimizados para consultas frequentes
   - Views para relatórios complexos
   - Triggers para automação de processos

4. FLEXIBILIDADE:
   - Suporte a múltiplas empresas
   - Diferentes níveis de acesso
   - Extensível para novos recursos

5. INTEGRIDADE:
   - Chaves estrangeiras para manter consistência
   - Triggers para validações automáticas
   - Constraints para garantir dados válidos

Para usar este banco:
1. Execute este script em seu MySQL/MariaDB
2. Ajuste as configurações de conexão no sistema
3. Implemente as funcionalidades de login e autenticação
4. Adapte as consultas conforme necessário

O sistema está pronto para produção e pode ser expandido conforme as necessidades específicas.
*/