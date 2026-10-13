const fs = require('fs');
const path = require('path');

const openapi = {
  openapi: "3.0.0",
  info: {
    title: "TrackBells ERP API Specification",
    description: "OpenAPI 3.0.0 specification for TrackBells Factory Automation SaaS ERP endpoints, covering Authentication, SaaS Tenants, Finance & Invoicing, Gate Logs, and Factory Operations.",
    version: "1.0.0"
  },
  servers: [
    {
      url: "https://trackbells.com/api",
      description: "Production Server"
    },
    {
      url: "http://localhost:9898/api",
      description: "Local Development Server"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token to access protected endpoints."
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    "/auth/register": {
      "post": {
        "summary": "Register New User",
        "tags": ["Authentication"],
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "John Doe" },
                  "email": { "type": "string", "example": "john@example.com" },
                  "password": { "type": "string", "example": "password123" },
                  "role": { "type": "string", "example": "supervisor" },
                  "organizationId": { "type": "string", "example": "60c72b2f9b1d8a23d45f78a1" }
                },
                "required": ["name", "email", "password", "organizationId"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "User registered successfully" }
        }
      }
    },
    "/auth/login": {
      "post": {
        "summary": "Login User",
        "tags": ["Authentication"],
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string", "example": "superadmin@trackbells.com" },
                  "password": { "type": "string", "example": "password123" }
                },
                "required": ["email", "password"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Login successful, returns token" }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "summary": "Logout User",
        "tags": ["Authentication"],
        "security": [],
        "responses": {
          "200": { "description": "User logged out successfully" }
        }
      }
    },
    "/auth/onboard/send-otp": {
      "post": {
        "summary": "Send Onboarding OTP",
        "tags": ["Authentication"],
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string", "example": "neworg@example.com" }
                },
                "required": ["email"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "OTP sent successfully" }
        }
      }
    },
    "/auth/onboard/verify-org": {
      "post": {
        "summary": "Verify OTP & Create Organization",
        "tags": ["Authentication"],
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string", "example": "neworg@example.com" },
                  "otp": { "type": "string", "example": "123456" },
                  "orgName": { "type": "string", "example": "New Factory Corp" },
                  "contactPhone": { "type": "string", "example": "+919876543210" }
                },
                "required": ["email", "otp", "orgName"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Organization and owner user created successfully" }
        }
      }
    },
    "/auth/forgot-password": {
      "post": {
        "summary": "Forgot Password",
        "tags": ["Authentication"],
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "email": { "type": "string", "example": "john@example.com" }
                },
                "required": ["email"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Reset email sent" }
        }
      }
    },
    "/auth/reset-password/{token}": {
      "put": {
        "summary": "Reset Password",
        "tags": ["Authentication"],
        "security": [],
        "parameters": [
          { "name": "token", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "password": { "type": "string", "example": "newsecurepassword123" }
                },
                "required": ["password"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Password reset successful" }
        }
      }
    },
    "/auth/me": {
      "get": {
        "summary": "Get Logged-in User Profile",
        "tags": ["Authentication"],
        "responses": {
          "200": { "description": "Returns current user details" }
        }
      }
    },
    "/auth/update-profile": {
      "put": {
        "summary": "Update Profile Details",
        "tags": ["Authentication"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "John Updated" },
                  "phone": { "type": "string", "example": "+919999999999" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Profile updated successfully" }
        }
      }
    },
    "/auth/change-password": {
      "put": {
        "summary": "Change User Password",
        "tags": ["Authentication"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "currentPassword": { "type": "string", "example": "password123" },
                  "newPassword": { "type": "string", "example": "mynewpassword123" }
                },
                "required": ["currentPassword", "newPassword"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Password updated successfully" }
        }
      }
    },
    "/organizations/mobile-check": {
      "get": {
        "summary": "Check Mobile Access Policy Status",
        "tags": ["SaaS Organizations & Settings"],
        "security": [],
        "parameters": [
          { "name": "email", "in": "query", "required": false, "schema": { "type": "string", "example": "superadmin@trackbells.com" } },
          { "name": "orgId", "in": "query", "required": false, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Returns if mobile access is allowed or blocked" }
        }
      }
    },
    "/organizations/settings": {
      "get": {
        "summary": "Get Organization Settings",
        "tags": ["SaaS Organizations & Settings"],
        "responses": {
          "200": { "description": "Returns current organization configurations" }
        }
      },
      "put": {
        "summary": "Update Organization Settings",
        "tags": ["SaaS Organizations & Settings"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "brandName": { "type": "string", "example": "TrackBells ERP" },
                  "brandSubtitle": { "type": "string", "example": "Factory Automation" },
                  "logo": { "type": "string", "example": "/logo.png" },
                  "themeColor": { "type": "string", "example": "#f97316" },
                  "footerText": { "type": "string", "example": "Powered by TrackBells" },
                  "allowMobileApp": { "type": "boolean", "example": true },
                  "disableScreenshots": { "type": "boolean", "example": false },
                  "requireBiometric": { "type": "boolean", "example": true },
                  "restrictCrossDepartment: ": { "type": "boolean", "example": true }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Settings updated successfully" }
        }
      }
    },
    "/organizations": {
      "get": {
        "summary": "Get All SaaS Tenants",
        "tags": ["SaaS Organizations & Settings"],
        "responses": {
          "200": { "description": "Returns organizations directory" }
        }
      },
      "post": {
        "summary": "Create Organization Tenant",
        "tags": ["SaaS Organizations & Settings"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "Star Connect" },
                  "contactEmail": { "type": "string", "example": "contact@starconnect.com" },
                  "contactPhone": { "type": "string", "example": "+918888888888" },
                  "address": { "type": "string", "example": "Plot 12, Industrial Area, Noida" }
                },
                "required": ["name", "contactEmail"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Organization created successfully" }
        }
      }
    },
    "/organizations/{id}/approve": {
      "put": {
        "summary": "Approve Organization",
        "tags": ["SaaS Organizations & Settings"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Organization approved" }
        }
      }
    },
    "/organizations/{id}/decline": {
      "put": {
        "summary": "Decline Organization",
        "tags": ["SaaS Organizations & Settings"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "remark": { "type": "string", "example": "Invalid business details" }
                },
                "required": ["remark"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Organization declined" }
        }
      }
    },
    "/organizations/{id}/force-reverify": {
      "post": {
        "summary": "Force Reverification Status",
        "tags": ["SaaS Organizations & Settings"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Reverification triggered" }
        }
      }
    },
    "/organizations/reverify-otp": {
      "post": {
        "summary": "Submit Reverification OTP",
        "tags": ["SaaS Organizations & Settings"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "orgId": { "type": "string", "example": "ORG_ID_HERE" },
                  "otp": { "type": "string", "example": "123456" }
                },
                "required": ["orgId", "otp"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Verification OTP checked" }
        }
      }
    },
    "/organizations/resend-reverify-otp": {
      "post": {
        "summary": "Resend Reverification OTP",
        "tags": ["SaaS Organizations & Settings"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "orgId": { "type": "string", "example": "ORG_ID_HERE" }
                },
                "required": ["orgId"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Reverification OTP resent" }
        }
      }
    },
    "/finance/vendors": {
      "get": {
        "summary": "Get All Vendors",
        "tags": ["Finance & Invoicing"],
        "responses": {
          "200": { "description": "Returns list of registered vendors" }
        }
      },
      "post": {
        "summary": "Create Vendor",
        "tags": ["Finance & Invoicing"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "Nylon Suppliers" },
                  "email": { "type": "string", "example": "sales@nylon.com" },
                  "phone": { "type": "string", "example": "+919876543211" },
                  "address": { "type": "string", "example": "Noida, UP" }
                },
                "required": ["name", "email"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Vendor created" }
        }
      }
    },
    "/finance/pos": {
      "get": {
        "summary": "Get All Purchase Orders",
        "tags": ["Finance & Invoicing"],
        "responses": {
          "200": { "description": "Returns POs list" }
        }
      },
      "post": {
        "summary": "Create Purchase Order",
        "tags": ["Finance & Invoicing"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "poNumber": { "type": "string", "example": "PO-2026-001" },
                  "vendor": { "type": "string", "example": "Nylon Suppliers" },
                  "items": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "description": { "type": "string", "example": "Nylon Pellets" },
                        "quantity": { "type": "number", "example": 500 },
                        "rate": { "type": "number", "example": 120 },
                        "amount": { "type": "number", "example": 60000 }
                      }
                    }
                  },
                  "subTotal": { "type": "number", "example": 60000 },
                  "gstAmount": { "type": "number", "example": 10800 },
                  "totalAmount": { "type": "number", "example": 70800 },
                  "terms": { "type": "string", "example": "Immediate delivery" }
                },
                "required": ["poNumber", "vendor", "items", "totalAmount"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "PO created" }
        }
      }
    },
    "/finance/pos/{id}/pdf": {
      "get": {
        "summary": "Download Purchase Order PDF",
        "tags": ["Finance & Invoicing"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Returns PDF binary download stream" }
        }
      }
    },
    "/finance/scan-invoice": {
      "post": {
        "summary": "Scan Invoice PDF (OCR)",
        "tags": ["Finance & Invoicing"],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": { "type": "string", "format": "binary" }
                },
                "required": ["file"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Returns OCR processed invoice data" }
        }
      }
    },
    "/finance/invoices": {
      "get": {
        "summary": "Get Scanned Invoices List",
        "tags": ["Finance & Invoicing"],
        "responses": {
          "200": { "description": "Returns OCR invoices list" }
        }
      }
    },
    "/finance/sales-invoices": {
      "get": {
        "summary": "Get Client Sales Invoices",
        "tags": ["Finance & Invoicing"],
        "responses": {
          "200": { "description": "Returns generated sales invoices" }
        }
      },
      "post": {
        "summary": "Create Client Sales Invoice",
        "tags": ["Finance & Invoicing"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "clientName": { "type": "string", "example": "Global Auto Industries" },
                  "clientEmail": { "type": "string", "example": "billing@globalauto.com" },
                  "clientPhone": { "type": "string", "example": "+919999999999" },
                  "clientAddress": { "type": "string", "example": "B-42, Phase II, Okhla" },
                  "gstin": { "type": "string", "example": "07AAAAA1111A1Z1" },
                  "invoiceNumber": { "type": "string", "example": "INV-2026-004" },
                  "dueDate": { "type": "string", "example": "2026-07-15" },
                  "items": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "description": { "type": "string", "example": "V-Belt Extrusion Section" },
                        "quantity": { "type": "number", "example": 2 },
                        "unitRate": { "type": "number", "example": 45000 },
                        "taxRate": { "type": "number", "example": 18 },
                        "total": { "type": "number", "example": 106200 }
                      }
                    }
                  },
                  "subTotal": { "type": "number", "example": 90000 },
                  "gstAmount": { "type": "number", "example": 16200 },
                  "grandTotal": { "type": "number", "example": 106200 }
                },
                "required": ["clientName", "invoiceNumber", "items", "grandTotal"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Sales invoice created" }
        }
      }
    },
    "/finance/sales-invoices/{id}/pdf": {
      "get": {
        "summary": "Download Sales Invoice PDF",
        "tags": ["Finance & Invoicing"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Returns PDF binary stream" }
        }
      }
    },
    "/finance/sales-invoices/{id}": {
      "delete": {
        "summary": "Delete Sales Invoice",
        "tags": ["Finance & Invoicing"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Invoice deleted" }
        }
      }
    },
    "/gate-entry/stats": {
      "get": {
        "summary": "Get Gate Entry Stats",
        "tags": ["Gate Entry Logs"],
        "responses": {
          "200": { "description": "Returns statistics count" }
        }
      }
    },
    "/gate-entry": {
      "get": {
        "summary": "Get All Gate Entries",
        "tags": ["Gate Entry Logs"],
        "responses": {
          "200": { "description": "Returns entries list" }
        }
      },
      "post": {
        "summary": "Create Gate Entry",
        "tags": ["Gate Entry Logs"],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "challanNo": { "type": "string", "example": "CH-9876" },
                  "vehicleNumber": { "type": "string", "example": "DL-1C-1234" },
                  "materialType": { "type": "string", "example": "raw_material" },
                  "quantity": { "type": "string", "example": "250" },
                  "unit": { "type": "string", "example": "kg" },
                  "invoiceFile": { "type": "string", "format": "binary" }
                },
                "required": ["challanNo", "vehicleNumber", "invoiceFile"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Gate entry created" }
        }
      }
    },
    "/gate-entry/{id}": {
      "get": {
        "summary": "Get Gate Entry Details",
        "tags": ["Gate Entry Logs"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Returns details object" }
        }
      },
      "put": {
        "summary": "Update Gate Entry Details",
        "tags": ["Gate Entry Logs"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "vehicleNumber": { "type": "string", "example": "HR-26-9999" },
                  "quantity": { "type": "number", "example": 260 }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Gate entry updated" }
        }
      },
      "delete": {
        "summary": "Delete Gate Entry",
        "tags": ["Gate Entry Logs"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Gate entry deleted" }
        }
      }
    },
    "/gate-entry/{id}/verify": {
      "put": {
        "summary": "Verify Gate Entry (Supervisor)",
        "tags": ["Gate Entry Logs"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "remarks": { "type": "string", "example": "Verified materials match invoice checklist." }
                },
                "required": ["remarks"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Gate entry verified" }
        }
      }
    },
    "/gate-entry/{id}/create-grn": {
      "put": {
        "summary": "Create GRN Handshake (Store Manager)",
        "tags": ["Gate Entry Logs"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "rackNumber": { "type": "string", "example": "Rack-A1" },
                  "binNumber": { "type": "string", "example": "Bin-12" }
                },
                "required": ["rackNumber", "binNumber"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "GRN Created successfully" }
        }
      }
    },
    "/operations/inventory": {
      "get": {
        "summary": "Get Inventory Items List",
        "tags": ["Factory Operations & Inventory"],
        "responses": {
          "200": { "description": "Returns items" }
        }
      },
      "post": {
        "summary": "Create Inventory Item",
        "tags": ["Factory Operations & Inventory"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "EPDM Rubber Profiles" },
                  "type": { "type": "string", "example": "raw_material" },
                  "quantity": { "type": "number", "example": 450 },
                  "unit": { "type": "string", "example": "kg" },
                  "location": { "type": "string", "example": "Warehouse A" },
                  "size": { "type": "string", "example": "Medium" },
                  "description": { "type": "string", "example": "Material for extrusions" }
                },
                "required": ["name", "type", "quantity"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Inventory item created" }
        }
      }
    },
    "/operations/inventory/{id}": {
      "put": {
        "summary": "Update Inventory Item",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "quantity": { "type": "number", "example": 500 },
                  "location": { "type": "string", "example": "Warehouse B" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Inventory updated" }
        }
      },
      "delete": {
        "summary": "Delete Inventory Item",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Inventory item deleted" }
        }
      }
    },
    "/operations/machines": {
      "get": {
        "summary": "Get Factory Machines",
        "tags": ["Factory Operations & Inventory"],
        "responses": {
          "200": { "description": "Returns machines list" }
        }
      },
      "post": {
        "summary": "Create New Machine",
        "tags": ["Factory Operations & Inventory"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": { "type": "string", "example": "Belt Extruder Machine" },
                  "status": { "type": "string", "example": "working" },
                  "remarks": { "type": "string", "example": "Tension and temperature calibrated" },
                  "capacity": { "type": "string", "example": "250 meters/hour" },
                  "modelNumber": { "type": "string", "example": "EXTR-300-X" },
                  "powerRating": { "type": "string", "example": "22 kW" },
                  "lastServiceDate": { "type": "string", "example": "2026-06-10" }
                },
                "required": ["name", "status"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Machine registered" }
        }
      }
    },
    "/operations/machines/{id}": {
      "put": {
        "summary": "Update Machine Status",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "status": { "type": "string", "example": "running" },
                  "remarks": { "type": "string", "example": "Calibrating core lines" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Machine updated" }
        }
      },
      "delete": {
        "summary": "Delete Machine",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Machine removed" }
        }
      }
    },
    "/operations/build-jobs": {
      "get": {
        "summary": "Get Production Build Jobs",
        "tags": ["Factory Operations & Inventory"],
        "responses": {
          "200": { "description": "Returns jobs list" }
        }
      },
      "post": {
        "summary": "Create Production Build Job",
        "tags": ["Factory Operations & Inventory"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "productName": { "type": "string", "example": "Conveyor Belt V-4" },
                  "orderQuantity": { "type": "number", "example": 200 },
                  "productSize": { "type": "string", "example": "50 meters" },
                  "estimatedDate": { "type": "string", "example": "2026-07-20" },
                  "materialsUsed": {
                    "type": "array",
                    "items": {
                      "type": "object",
                      "properties": {
                        "materialName": { "type": "string", "example": "EPDM Rubber Profiles" },
                        "quantity": { "type": "number", "example": 150 },
                        "unit": { "type": "string", "example": "kg" }
                      }
                    }
                  }
                },
                "required": ["productName", "orderQuantity", "materialsUsed"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Build job created" }
        }
      }
    },
    "/operations/build-jobs/{id}": {
      "put": {
        "summary": "Update Build Job Status",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "status": { "type": "string", "example": "running" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Build job updated" }
        }
      }
    },
    "/operations/build-jobs/{id}/send-to-store": {
      "put": {
        "summary": "Send Completed Build to Store",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Sent for handshake" }
        }
      }
    },
    "/operations/build-jobs/{id}/receive": {
      "put": {
        "summary": "Receive Build Products into Inventory (Store Manager)",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Handshake complete, inventory updated" }
        }
      }
    },
    "/operations/qc-logs": {
      "get": {
        "summary": "Get Quality Control Logs",
        "tags": ["Factory Operations & Inventory"],
        "responses": {
          "200": { "description": "Returns logs list" }
        }
      },
      "post": {
        "summary": "Create Quality Control Log",
        "tags": ["Factory Operations & Inventory"],
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "batchNumber": { "type": "string", "example": "BATCH-V4-08" },
                  "inspector": { "type": "string", "example": "QC Lead Officer" },
                  "parameters": { "type": "string", "example": "Tensile strength >= 25MPa" },
                  "status": { "type": "string", "example": "pass" },
                  "defectsFound": { "type": "string", "example": "none" },
                  "invoiceFile": { "type": "string", "format": "binary" }
                },
                "required": ["batchNumber", "status"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "QC Log entry created" }
        }
      }
    },
    "/operations/qc-logs/{id}/verify": {
      "put": {
        "summary": "Verify QC Log",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "remarks": { "type": "string", "example": "Tensile metrics match safety guidelines." }
                },
                "required": ["remarks"]
              }
            }
          }
        },
        "responses": {
          "200": { "description": "QC log verified" }
        }
      }
    },
    "/operations/qc-logs/{id}": {
      "delete": {
        "summary": "Delete QC Log",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "QC log deleted" }
        }
      }
    },
    "/operations/shortage-buy-sales": {
      "get": {
        "summary": "Get Shortage & Buy/Sale Records",
        "tags": ["Factory Operations & Inventory"],
        "responses": {
          "200": { "description": "Returns records list" }
        }
      },
      "post": {
        "summary": "Create Shortage Buy/Sale Record",
        "tags": ["Factory Operations & Inventory"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "type": { "type": "string", "example": "buy" },
                  "materialName": { "type": "string", "example": "Polyester Spools" },
                  "quantity": { "type": "number", "example": 40 },
                  "unit": { "type": "string", "example": "pcs" },
                  "targetPrice": { "type": "number", "example": 320 },
                  "supplier": { "type": "string", "example": "Loom suppliers" },
                  "status": { "type": "string", "example": "requested" }
                },
                "required": ["type", "materialName", "quantity"]
              }
            }
          }
        },
        "responses": {
          "201": { "description": "Record created" }
        }
      }
    },
    "/operations/shortage-buy-sales/{id}": {
      "put": {
        "summary": "Update Shortage Buy/Sale Status",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "status": { "type": "string", "example": "completed" },
                  "actualPrice": { "type": "number", "example": 310 }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Record updated" }
        }
      },
      "delete": {
        "summary": "Delete Shortage Buy/Sale Record",
        "tags": ["Factory Operations & Inventory"],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Record deleted" }
        }
      }
    }
  }
};

// Write specification to root workspace folder
const outputPath = path.join(__dirname, '../TrackBells_OpenAPI_Spec.json');
fs.writeFileSync(outputPath, JSON.stringify(openapi, null, 2), 'utf8');
console.log(`Successfully generated OpenAPI Specification at ${outputPath}`);
