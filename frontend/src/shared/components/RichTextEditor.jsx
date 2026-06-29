// Copyright (c) 2026 Mohamed Yehia
// SPDX-License-Identifier: AGPL-3.0

import { useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ align: [] }],
    [{ color: [] }, { background: [] }],
    ['blockquote', 'code-block'],
    [{ direction: 'rtl' }],
    ['clean'],
  ],
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'align', 'color', 'background',
  'blockquote', 'code-block', 'direction',
];

export default function RichTextEditor({ value, onChange, placeholder, style }) {
  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, ...style }}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder || 'Contract content...'}
        style={{ minHeight: 400 }}
      />
    </div>
  );
}
