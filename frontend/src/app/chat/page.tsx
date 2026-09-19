'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL, authHeaders } from '@/lib/utils';
import { MessageSquare, Plus, Send } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Quản trị', manager: 'Quản lý', sales: 'Tư vấn', sales_leader: 'Trưởng phòng sale',
  academic: 'Đào tạo', teacher: 'Giáo viên', accountant: 'Kế toán', student: 'Học viên',
};

export default function ChatPage() {
  const [convs, setConvs] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showContacts, setShowContacts] = useState(false);
  const [me, setMe] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef<string | null>(null);

  const loadConvs = () =>
    fetch(`${API_URL}/api/chat/conversations`, { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(d => setConvs(d.data || []));

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (raw) setMe(JSON.parse(raw).id);
    loadConvs();
    fetch(`${API_URL}/api/chat/contacts`, { headers: authHeaders() })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(d => setContacts(d.data || []));
    const t = setInterval(loadConvs, 10000);
    return () => clearInterval(t);
  }, []);

  // polling tin nhắn của hội thoại đang mở
  useEffect(() => {
    if (!active) return;
    sinceRef.current = null;
    let stop = false;
    // tải toàn bộ lần đầu
    (async () => {
      const r = await fetch(`${API_URL}/api/chat/conversations/${active.id}/messages`, { headers: authHeaders() });
      if (r.ok && !stop) {
        const d = await r.json();
        sinceRef.current = d.now;
        setMessages(d.data || []);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 50);
      }
    })();
    const t = setInterval(async () => {
      if (!sinceRef.current) return;
      const r = await fetch(`${API_URL}/api/chat/conversations/${active.id}/messages?since=${encodeURIComponent(sinceRef.current)}`, { headers: authHeaders() });
      if (!r.ok || stop) return;
      const d = await r.json();
      sinceRef.current = d.now;
      if (d.data?.length) {
        setMessages(prev => [...prev, ...d.data]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }, 8000);
    return () => { stop = true; clearInterval(t); };
  }, [active?.id]);

  const startChat = async (userId: string) => {
    const r = await fetch(`${API_URL}/api/chat/conversations`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const d = await r.json();
    if (r.ok) {
      setShowContacts(false);
      await loadConvs();
      setActive({ id: d.id, title: contacts.find(c => c.id === userId)?.name || 'Hội thoại' });
    }
  };

  const send = async () => {
    if (!text.trim() || !active) return;
    const r = await fetch(`${API_URL}/api/chat/conversations/${active.id}/messages`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text }),
    });
    if (r.ok) {
      const msg = await r.json();
      setMessages(prev => [...prev, msg]);
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  };

  return (
    <div className="flex h-full gap-4">
      {/* Danh sách hội thoại */}
      <aside className={`w-full shrink-0 flex-col rounded-xl border border-slate-200 bg-white sm:flex sm:w-72 ${active ? 'hidden' : 'flex'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
          <h2 className="flex items-center gap-1.5 text-[13px] font-semibold"><MessageSquare className="h-4 w-4" /> Tin nhắn</h2>
          <button onClick={() => setShowContacts(!showContacts)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" title="Hội thoại mới">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {showContacts && (
          <div className="max-h-60 overflow-y-auto border-b border-slate-100">
            {contacts.map(c => (
              <button key={c.id} onClick={() => startChat(c.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700">
                  {c.name?.[0]?.toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="block truncate text-[11px] text-slate-400">
                    {(c.roles || []).map((r: string) => ROLE_LABELS[r] || r).join(', ')}{c.code ? ` · ${c.code}` : ''}
                  </span>
                </span>
              </button>
            ))}
            {contacts.length === 0 && <p className="px-3 py-4 text-center text-xs text-slate-400">Không có liên hệ</p>}
          </div>
        )}
        <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
          {convs.map(c => (
            <li key={c.id}>
              <button
                onClick={() => setActive(c)}
                className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 ${active?.id === c.id ? 'bg-brand-50' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">{c.title}</span>
                  {c.unread > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">{c.unread}</span>
                  )}
                </div>
                {c.lastMessage && (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {c.lastMessage.sender?.name}: {c.lastMessage.content}
                  </p>
                )}
              </button>
            </li>
          ))}
          {convs.length === 0 && <li className="px-3 py-8 text-center text-xs text-slate-400">Chưa có hội thoại — bấm + để bắt đầu</li>}
        </ul>
      </aside>

      {/* Khung chat */}
      <section className={`min-w-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white ${active ? 'flex' : 'hidden sm:flex'}`}>
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-sm text-slate-400">Chọn hội thoại</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
              <button onClick={() => setActive(null)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 sm:hidden">←</button>
              <h3 className="text-[13px] font-semibold">{active.title}</h3>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3">
              {messages.map(m => {
                const mine = m.senderId === me;
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                      mine ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {!mine && <div className="text-[10px] font-medium text-slate-400">{m.sender?.name}</div>}
                      <div className="whitespace-pre-wrap break-words">{m.content}</div>
                      <div className={`mt-0.5 text-right text-[9px] ${mine ? 'text-brand-200' : 'text-slate-400'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-2 border-t border-slate-100 p-2.5">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Nhập tin nhắn…"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none"
              />
              <button onClick={send} disabled={!text.trim()}
                className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700 disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
