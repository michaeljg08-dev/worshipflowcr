import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, size = '', footer }) {
    if (!open) return null;
    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className={`modal ${size}`} role="dialog">
                <div className="modal-header">
                    <h2 className="modal-title">{title}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body">{children}</div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
}
