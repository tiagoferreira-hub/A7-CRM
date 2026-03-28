import React, { useState } from "react";
import { useServices } from "@/context/ServicesContext";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

const Settings: React.FC = () => {
  const { services, addService, updateService, deleteService } = useServices();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addService(trimmed);
    setNewName("");
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const saveEdit = () => {
    if (editingId && editName.trim()) {
      updateService(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h2 className="text-xl font-bold text-foreground mb-6">Configurações</h2>

      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-base font-semibold text-foreground mb-4">Serviços</h3>

        {/* Add new */}
        <div className="flex gap-2 mb-6">
          <input
            className="flex-1 text-sm border border-input rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Nome do novo serviço..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {/* List */}
        <div className="space-y-1">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/50 transition-colors group"
            >
              {editingId === service.id ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    className="flex-1 text-sm border border-input rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                    autoFocus
                  />
                  <button onClick={saveEdit} className="p-1 rounded hover:bg-accent text-crm-success">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-accent text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-sm text-foreground">{service.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(service.id, service.name)}
                      className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteService(service.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum serviço cadastrado</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
