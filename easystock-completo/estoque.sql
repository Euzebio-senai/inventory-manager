

CREATE TABLE categorias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT
);

CREATE TABLE fornecedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    telefone VARCHAR(20),
    cnpj VARCHAR(20),
    endereco TEXT
);

CREATE TABLE produtos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    categoria_id INT,
    fornecedor_id INT,
    preco_compra DECIMAL(10,2),
    preco_venda DECIMAL(10,2),
    estoque INT DEFAULT 0,
    estoque_min INT DEFAULT 0,
    descricao TEXT,
    FOREIGN KEY (categoria_id) REFERENCES categorias(id),
    FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id)
);

CREATE TABLE movimentacoes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    produto_id INT,
    tipo ENUM('entrada', 'saida'),
    quantidade INT,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacao TEXT,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);