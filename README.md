# Consulta SAP - Portal Empresarial Firplak S.A.

Portal unificado de consulta y gestión de documentos ERP en **Next.js (App Router, TypeScript, Tailwind CSS)** integrado directamente con **SAP Business One Service Layer (Firplak_SA)**.

---

## 🚀 Módulos del Sistema

1. **Ventas (Consulta y Transaccional)**:
   - **Facturas de Deudores (OINV):** Conectado en tiempo real al Service Layer de SAP con búsqueda por rango de fechas, texto y paginación por servidor.
   - **Pedidos de Clientes (ORDR)**
   - **Directorio de Clientes (OCRD)**

2. **Compras (Consulta y Transaccional)**:
   - **Entrada de Mercancía (OPDN)**
   - **Orden de Compra (OPOR)**
   - **Precio de Entrega / Landed Costs (IPDN)**

3. **Inventarios**:
   - Entradas (OIGN), Salidas (OIGE), Traslados (OWTR) e Informe de Auditoría de Stocks (OINM).

4. **Socios de Negocios**:
   - Catálogo de Clientes y Proveedores con saldos en cartera.

5. **Maestro del Artículo**:
   - Catálogo de artículos (OITM) con stock disponible, comprometido y pedido.

6. **Localización HBT**:
   - Descarga y liquidación de Gastos de Exportación (Expo).

7. **Querys y Analítica**:
   - Costo de Producto Terminado, Facturas Cliente Final y Salidas por Concepto Consolidado.

---

## 🛠️ Requisitos e Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/FirplakDesarrollador/consulta-sap.git
cd consulta-sap
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno (`.env.local`):
```env
SAP_BASE_URL=https://200.7.96.194:50000/b1s/v1
SAP_COMPANY_DB=Firplak_SA
SAP_USERNAME=manager
SAP_PASSWORD="tu_password"
```

4. Iniciar en desarrollo:
```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).
