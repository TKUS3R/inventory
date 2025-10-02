# Despliegue en AWS EC2 — Inventory (Node.js + SQLite)

Repo: https://github.com/josecastineiras/inventory

## Requisitos
- Cuenta AWS.
- Permisos para crear EC2, Security Groups y Key Pairs.
- AMI: **Ubuntu Server 22.04 LTS (x86_64)**.
- Tipo instancia sugerido: **t3.micro** (free tier).
- Puerto de la app: **3001** (o detrás de Nginx en 80/443).

---

## 1.a) Despliegue manual por consola (SSH)

### 1) Crear la instancia EC2
- **AMI**: Ubuntu 22.04 LTS  
- **Tipo**: t3.micro  
- **Security Group**:  
  - Inbound: TCP **22** (SSH) desde tu IP  
  - Inbound: TCP **3001** (HTTP de la app) desde tu IP o 0.0.0.0/0 (demo)  
- **Key Pair**: generar o reutilizar `.pem`

### 2) Conectarse por SSH
```bash
chmod 400 tu-clave.pem
ssh -i tu-clave.pem ubuntu@EC2_PUBLIC_IP
