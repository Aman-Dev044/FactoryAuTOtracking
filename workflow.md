# Star Conect ERP — Complete Workflow & Requirement Mapping Guide 📋

---

## 📌 Overview & Purpose

Client dwara provide ki gayi **`ERP work flow.pdf`** requirement sheet ke mutabiq humne poore system me missing features, forms, workflows, dynamic amount calculation, aur dashboards implement kiye hain. Is document me har ek change, uska fayda (**Isko karne se kya hoga**), aur kis-kis role ko yeh dikhega (**Kiskisko show hoga**) simple and easy language me detailed hai.

---

## 🛠️ Detailed Feature & Requirement Mapping

---

### 1. 💰 Dynamic Inventory Amount Calculation & Valuation Banner

- 📜 **Kis Requirement Ke Liye Banaya**:
  - *User Requirement*: `"yrr amout calculate hokr show hona chahiye sales me b inventory me admi ko b"`
- 💡 **Isko Karne Se Kya Hoga**:
  - Store aur Sales inventory me har item ke aage **Unit Rate (₹)** aur calculated **Total Amount (₹)** (`Available Qty × Unit Price`) dikhega.
  - Inventory table ke upar **📦 Total Unified Inventory Stock Valuation (₹)** banner live dynamic calculate karke factory floor ke poore stock ka kul moolya (valuation amount) batayega.
  - Admin dashboard ke Inventory KPI card me live total stock valuation amount (₹) automatically dikhega.
- 👁️ **Kiskisko Show Hoga**:
  - 📦 **Store Manager** (`Store Workspace` → `Unified Inventory` table & valuation banner)
  - 👤 **Sales Team** (`Sales Workspace` → `Available Store Stock` table & valuation banner)
  - 👑 **Super Admin & Admin** (`Admin Tracker` KPI card & all workspaces)
- 📁 **File Locations**:
  - Backend Model: [`InventoryItem.js`](file:///d:/Factory-automation/backend/models/InventoryItem.js) (added `unitPrice` field)
  - Frontend: [`StoreDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/store/StoreDashboard.jsx), [`SalesDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/sales/SalesDashboard.jsx), [`AdminTrackerDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/admin/AdminTrackerDashboard.jsx)

---

### 2. 🎯 Sales Pipeline & Order Funnel (`Lead → Quotation → PI → Customer PO → Sales Order`)

- 📜 **Kis PDF Requirement Ke Liye Banaya**:
  - *PDF Point 1 (Sales)*: `"Lead → Quotation → PI → Customer PO → Sales Order - Upload and share to dispatch team. Track visits, follow-ups, complaints, payments..."`
- 💡 **Isko Karne Se Kya Hoga**:
  - Ek customer lead aane se lekar Quotation, Proforma Invoice (PI), Customer PO, aur final Sales Order tak ka exact stage-wise tracking hoga. Sales team ek click me order ko agle stage me advance kar sakti hai aur follow-up notes maintain kar sakti hai.
- 👁️ **Kiskisko Show Hoga**:
  - 👤 **Sales Team** (`Sales Workspace` → `Sales Pipeline & Funnel` tab)
  - 👑 **Super Admin & Admin** (`Admin Tracker` & `Sales Workspace`)
- 📁 **File Locations**:
  - Backend: [`SalesPipeline.js`](file:///d:/Factory-automation/backend/models/SalesPipeline.js), [`salesPipelineController.js`](file:///d:/Factory-automation/backend/controllers/salesPipelineController.js)
  - Frontend: [`SalesPipelineTab.jsx`](file:///d:/Factory-automation/frontend/src/pages/sales/SalesPipelineTab.jsx)

---

### 3. ⚙️ Drag Chain Configuration Form (Sales Team Order Booking)

- 📜 **Kis PDF Requirement Ke Liye Banaya**:
  - *PDF Page 2 (Drag Chain Configuration)*: `"Drag Chain Configuration: which has to filled by sales team --- Series, Height, Width, Radius, Open/Closed, Separator & Qty, Bracket Type, Length, Quantity"`
- 💡 **Isko Karne Se Kya Hoga**:
  - Sales team order le ke waqt hi exact technical parameters daal payegi. Production aur Store team ko pata chalega ki konse Series, Height, Width, Bending Radius, Separator, aur Bracket Type ka chain assemble aur dispatch karna hai, jisse wrong supply ya manufacturing error zero ho jayega.
- 👁️ **Kiskisko Show Hoga**:
  - 👤 **Sales Team** (Order Entry Modal me)
  - 📦 **Store Manager** (Packing & Dispatch karte waqt view ke liye)
  - 👑 **Admin**
- 📁 **File Locations**:
  - Frontend: [`SalesPipelineTab.jsx`](file:///d:/Factory-automation/frontend/src/pages/sales/SalesPipelineTab.jsx)

---

### 4. 🚨 Credit Due Date & Red Overdue Alert System

- 📜 **Kis PDF Requirement Ke Liye Banaya**:
  - *PDF Point 1 (Sales)*: `"Credit details mention in PI and reflect after that days in red colour"`
- 💡 **Isko Karne Se Kya Hoga**:
  - Order ya PI me Credit Days (e.g., 30 days) set hote hi Credit Due Date calculate ho jaati hai. Agar due date nikalne par bhi payment pending rehti hai, to system date ko **BRIGHT RED 🚨 CREDIT OVERDUE** warning badge me change kar deta hai. Iss se overdue accounts ka immediately payment follow-up liya ja sakta hai.
- 👁️ **Kiskisko Show Hoga**:
  - 👤 **Sales Team** (`Sales Pipeline` table & red counter badge)
  - 💰 **Finance / Accounts Team**
  - 👑 **Admin** (`Admin Tracker` KPI card)
- 📁 **File Locations**:
  - Frontend: [`SalesPipelineTab.jsx`](file:///d:/Factory-automation/frontend/src/pages/sales/SalesPipelineTab.jsx) & [`AdminTrackerDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/admin/AdminTrackerDashboard.jsx)

---

### 5. 🚚 Dispatch & Shipping Logistics Module

- 📜 **Kis PDF Requirement Ke Liye Banaya**:
  - *PDF Point 9 (Dispatch)*: `"Dispatch: Received order from Sales, Packing, Orders update like Assemble, hold, packing, dispatch, LR copy, courier, tracking, POD upload"`
- 💡 **Isko Karne Se Kya Hoga**:
  - Order receive hone se packing (`Assemble → Hold → Packing → Dispatched`), box count, total weight, courier name, AWB tracking #, LR Receipt number, **LR Copy document**, aur **Proof of Delivery (POD)** upload track hoga. Customer ko shipping link aur LR copy share karna to-the-point aasan ho jayega.
- 👁️ **Kiskisko Show Hoga**:
  - 📦 **Store Manager**: Primary Manager (`Store Workspace` → `🚚 Dispatch & Shipping` tab) — Entry, Packing & Dispatched updates.
  - 👤 **Sales Team**: View & Tracking (`Sales Workspace` → `🚚 Dispatch Tracking` tab) — LR Copy & Tracking ID client ko bhejone ke liye.
  - 👑 **Admin**: Full tracking & live status (`Admin Tracker`).
- 📁 **File Locations**:
  - Backend: [`Dispatch.js`](file:///d:/Factory-automation/backend/models/Dispatch.js), [`dispatchController.js`](file:///d:/Factory-automation/backend/controllers/dispatchController.js)
  - Frontend: [`DispatchTab.jsx`](file:///d:/Factory-automation/frontend/src/pages/store/DispatchTab.jsx), [`StoreDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/store/StoreDashboard.jsx), [`SalesDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/sales/SalesDashboard.jsx)

---

### 6. 🔬 Quality Control (4 Outcomes & 2 Inspection Stages)

- 📜 **Kis PDF Requirement Ke Liye Banaya**:
  - *PDF Point 7 (Quality)*: `"Quality: First inspection, dimensions, radius, open/closed, separator, conduit clamp/gland, final inspection, Pass/Hold/Reject/Rework"`
- 💡 **Isko Karne Se Kya Hoga**:
  - Inspection ko 2 stages (`First Inspection` & `Final Inspection`) me divide kiya gaya hai. 4 clear status outcomes (`PASS`, `HOLD`, `REJECT`, `REWORK`) diye gaye hain. Defective material ka rework reason note ke sath log hoga, jisse damaged stock godown me mix nahi hoga.
- 👁️ **Kiskisko Show Hoga**:
  - 🔬 **Quality Checker** (`Quality Workspace`)
  - 📦 **Store Manager** & 👤 **Sales Team** (QC Reports Table me)
  - 👑 **Admin**
- 📁 **File Locations**:
  - Backend: [`QualityLog.js`](file:///d:/Factory-automation/backend/models/QualityLog.js)
  - Frontend: [`QualityDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/quality/QualityDashboard.jsx)

---

### 7. 📊 Admin Dashboard Live KPI Cards & Valuation

- 📜 **Kis PDF Requirement Ke Liye Banaya**:
  - *PDF Point 10 (Admin Dashboard)*: `"Admin Dashboard: Today's Sales, Production, Pending Orders, Material Shortage, Machine Status, Dispatch Pending, Payment Due..."`
- 💡 **Isko Karne Se Kya Hoga**:
  - Management/Owners ko live factory floor metrics ek screen par milenge: total inventory valuation amount (₹), kitne orders packing/dispatch pending me hain, aur kitni payments overdue me hain.
- 👁️ **Kiskisko Show Hoga**:
  - 👑 **Super Admin & Admin** (`Admin Tracker Dashboard`)
- 📁 **File Locations**:
  - Frontend: [`AdminTrackerDashboard.jsx`](file:///d:/Factory-automation/frontend/src/pages/admin/AdminTrackerDashboard.jsx)

---

## 🗺️ Role-Wise Quick Summary Table

| Role | Access Feature | PDF Module Mapped | URL / Navigation |
|---|---|---|---|
| 📦 **Store Manager** | Dispatch Management, Inventory Unit Price & Total Valuation (₹) | PDF Point 8 & 9 (FG Store & Dispatch) | Store Workspace → `Unified Inventory` & `🚚 Dispatch & Shipping` |
| 👤 **Sales Team** | Order Pipeline, Drag Chain Specs, Credit Red Alert, Inventory Valuation (₹), Dispatch Tracking | PDF Point 1 & Page 2 (Sales & Drag Chain Config) | Sales Workspace → `🎯 Pipeline`, `Available Stock` & `🚚 Dispatch Tracking` |
| 🔬 **Quality Checker** | First/Final Inspection & 4 Outcomes (Pass/Hold/Reject/Rework) | PDF Point 7 (Quality) | Quality Workspace → `+ Add Inspection Record` |
| 👑 **Super Admin / Admin** | All Dashboards, Live Stock Valuation (₹) + Real-Time Live KPIs | PDF Point 10 (Admin Dashboard) | Admin Tracker Dashboard & All Routes |

---

*Updated and saved in project root directory at [workflow.md](file:///d:/Factory-automation/workflow.md).*
