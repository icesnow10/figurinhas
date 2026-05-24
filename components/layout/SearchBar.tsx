'use client';

import { useRef } from 'react';
import { Input, type InputRef } from 'antd';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function SearchBar({ value, onChange, placeholder, style }: Props) {
  const inputRef = useRef<InputRef>(null);
  const temTexto = value.length > 0;

  const aoApertarBotao = () => {
    if (temTexto) {
      onChange('');
    }
    inputRef.current?.blur();
  };

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', ...style }}>
      <Input
        ref={inputRef}
        size="large"
        placeholder={placeholder}
        prefix={<Search size={16} color="#9aa6c9" />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1 }}
      />
      <button
        type="button"
        onClick={aoApertarBotao}
        aria-label={temTexto ? 'Limpar busca' : 'Confirmar busca'}
        style={{
          minWidth: 48,
          padding: '0 14px',
          borderRadius: 8,
          border: 'none',
          cursor: 'pointer',
          background: temTexto ? '#dc2626' : '#16a34a',
          color: '#fff',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s ease',
        }}
      >
        {temTexto ? <X size={20} /> : <Search size={20} />}
      </button>
    </div>
  );
}
