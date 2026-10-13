# 🗄️ TrackBells ERP — Comprehensive Database & Shortage Architecture Documentation

---

## 📌 1. Database Overview & Core Specifications

* **Database Engine**: MongoDB (NoSQL Document Store)
* **Object Data Modeling (ODM)**: Mongoose ORM / ODM
* **Production Database Name**: `trackbells-erp` *(Development / Staging: `str-drg-erp`)*
* **Architecture**: **Multi-Tenant SaaS Architecture**
* **Tenant Isolation Mechanism**: Automatic query scoping via `organizationId` using Node.js `AsyncLocalStorage` (`tenantPlugin.js`). Every database collection isolates data by company tenant ID, ensuring zero data leakage across different clients.

---

## 📁 2. Active Database Collections Breakdown

The database contains **17 Active Collections** strictly used in the project lifecycle:

### 🏢 A. Tenant & User Access Control
| Collection Name in DB | Mongoose Model | Purpose & Data Stored | How Data Belongs / Flow |
| :--- | :--- | :--- | :--- |
| `users` | `User` | Stores all user profiles, encrypted passwords, roles (`super_admin`, `admin`, `gate_guard`, `supervisor`, `production_manager`, `quality_checker`, `store_manager`, `sales`, `dispatch`), email, phone, and tenant `organizationId`. | Created by Admin/Super Admin in User Management. Used for authentication and role-based access. |
| `organizations` | `Organization` | Stores SaaS Tenant Companies, custom branding (Logo, Name), address, modules enabled, footer text, custom sidebar permissions. | Populated during tenant onboarding or updated in Admin > Settings. |
| `supporttickets` | `SupportTicket` | Help & support tickets submitted by users to platform admins. | Created when users click Help & Support in sidebar. |

---

### 📦 B. Inventory & Stock Tracking
| Collection Name in DB | Mongoose Model | Purpose & Data Stored | How Data Belongs / Flow |
| :--- | :--- | :--- | :--- |
| `inventoryitems` | `InventoryItem` | Stores Unified Inventory (Raw Materials, Finished Goods, Hardware, Custom Tools). Tracks `quantity`, `unit`, `unitPrice`, `location`, `warehouseLocation`, `almirah`, `rack`, QC status, and Shortage status. | Managed by Store Manager in Store & Godown. Updated automatically on Gate Entry GRN receipt or Dispatch. |

---

### 🚨 C. Shortage, Buy & Sale Management (Core Engine)
| Collection Name in DB | Mongoose Model | Purpose & Data Stored | How Data Belongs / Flow |
| :--- | :--- | :--- | :--- |
| `shortagebuysales` | `ShortageBuySale` | Master log for **Shortage, Buy, & Sale** entries. Stores `type` (`shortage`, `buy`, `sale`), `itemName`, `quantity`, `assignedTo` (`supervisor`, `sales`, `store_manager`), `status` (`pending`, `assigned`, `ordered`, `completed`), and complete Drag Chain specs (`modelNumber`, `size`, `radius`, `designType`, `vs`, `hs`, `sr`). | Created by Store Manager / Sales Manager during Real-Time Task Assignment or automated shortage detection. |

---

### ⚙️ D. Manufacturing & Production Execution
| Collection Name in DB | Mongoose Model | Purpose & Data Stored | How Data Belongs / Flow |
| :--- | :--- | :--- | :--- |
| `buildjobs` | `BuildJob` | Manufacturing Production Orders for Drag Chains. Stores `productName`, `modelNumber`, `productSize`, `orderQuantity`, `assignedMachine`, `productionLine`, countdown timers, `shortageLogId`, `materialsUsed`. | Placed by Sales / Store Manager to Supervisor. Linked directly to `shortagebuysales`. |
| `machines` | `Machine` | Injection moulding & link assembly machines, status (`running`, `maintenance`, `idle`), line assignment. | Configured by Admin / Production Manager. |
| `producttemplates` | `ProductTemplate` | Master Drag Chain catalog definitions (260+ standard series, dimensions, radii, design types). | Used for auto-filling specs when Model Number is selected. |

---

### 🚚 E. Logistics, Gate Entry & Shipping
| Collection Name in DB | Mongoose Model | Purpose & Data Stored | How Data Belongs / Flow |
| :--- | :--- | :--- | :--- |
| `gateentries` | `GateEntry` | Inbound Material Gate Pass & Vehicle Log. Stores `billNumber`, `vendorName`, `vehicleNumber`, `driverName`, `materialType`, `quantity`, `grnNumber` (auto-generated), Gate Pass status (`pending`, `approved`, `declined`). | Logged by Gate Guard at factory gate upon material truck arrival. |
| `dispatches` | `Dispatch` | Outbound Customer Shipping & Delivery log. Stores `customerName`, `customerContact`, `salesOrderRef`, `items`, `status` (`assemble`, `hold`, `packing`, `dispatched`), `courier`, `trackingNumber` (AWB), `lrCopyUrl` (PDF), `podUrl` (Proof of Delivery PDF), Gate Pass approval. | Managed by Store Manager / Dispatcher. |

---

### 🔍 F. Quality Control, Finance & Utility
| Collection Name in DB | Mongoose Model | Purpose & Data Stored | How Data Belongs / Flow |
| :--- | :--- | :--- | :--- |
| `qualitylogs` | `QualityLog` | QC Inspections for inbound/outbound goods. Stores `inspectedQty`, `passedQty`, `damagedQty`, `missedQty`, defect remarks, attached scanned invoice URLs (`invoiceUrl`). | Logged by Quality Checker in Quality Control Dashboard. |
| `salespipelines` | `SalesPipeline` | CRM Sales Funnel & Quotation Pipeline. Tracks deal stages, Drag Chain PDF configurations, quotation ref, PI/PO doc links, credit due dates. | Managed by Sales Team. |
| `invoices` | `Invoice` | Supplier invoice documents. | Logged in Finance / QC. |
| `salesinvoices` | `SalesInvoice` | Customer Sales Invoices generated upon dispatch. | Generated by Sales / Finance. |
| `purchaseorders` | `PurchaseOrder` | External raw material purchase orders. | Issued to vendors. |
| `vendors` | `Vendor` | Vendor master profiles & supplier contacts. | Managed in Finance / Admin. |
| `notifications` | `Notification` | System alerts & real-time socket notifications. | Generated automatically on status changes. |

---

## 🛠️ 3. How Shortage, Buy & Sale Flow Works in MongoDB

```
+-----------------------------------------------------------------------------------+
|                              SHORTAGE GENERATION                                  |
|                                                                                   |
|  1. Automated Detection: InventoryItem (quantity <= minStock) -> isShortage: true |
|  2. Manual Sourcing Task: Store Manager / Sales creates ShortageBuySale entry     |
|  3. Production Deficit: Supervisor flags missing links on BuildJob                 |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        MONGODB COLLECTION: shortagebuysales                       |
|                                                                                   |
|  - type: "shortage" | "buy" | "sale"                                              |
|  - itemName: "Drag Chain 3435.45.1 (45X100 R75 OP VS:2 HS:1 SR:Yes)"              |
|  - quantity: 50 pcs                                                               |
|  - assignedTo: "supervisor" OR "sales"                                            |
|  - status: "pending" -> "assigned" -> "ordered" -> "completed"                    |
|  - Drag Chain Specs: modelNumber, size, radius, designType, vs, hs, sr            |
+-----------------------------------------------------------------------------------+
                                         |
                    +--------------------+--------------------+
                    |                                         |
                    v                                         v
+---------------------------------------+   +---------------------------------------+
|  PATH A: Internal Production (Make)   |   |  PATH B: External Purchase (Buy/Sale) |
+---------------------------------------+   +---------------------------------------+
| - Created in `buildjobs` collection   |   | - Assigned to `sales` or Vendor.      |
| - `shortageLogId` points to Shortage. |   | - Logged as `type: "buy"` in          |
| - Supervisor starts moulding/assembly |   |   `shortagebuysales`.                 |
| - Linked countdown timer tracks job.  |   | - Gate Guard receives items via       |
|                                       |   |   `gateentries` (GRN generated).      |
+---------------------------------------+   +---------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                               SHORTAGE RESOLUTION                                 |
|                                                                                   |
|  1. ShortageBuySale status -> "completed"                                         |
|  2. InventoryItem stock quantity incremented automatically                        |
|  3. isShortage flag cleared in Database                                           |
+-----------------------------------------------------------------------------------+
```

---

*Document compiled for TrackBells ERP System.*
