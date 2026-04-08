'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import type { Member } from '@/lib/types';
import { formatDate, getLocalDateValue } from '@/lib/utils';

type Notice = {
  tone: 'success' | 'error';
  message: string;
};

type MemberFormState = {
  member_code: string;
  name: string;
  phone: string;
  address: string;
  joined_date: string;
  notes: string;
};

const createEmptyForm = (): MemberFormState => ({
  member_code: '',
  name: '',
  phone: '',
  address: '',
  joined_date: getLocalDateValue(),
  notes: '',
});

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState<MemberFormState>(createEmptyForm);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isCancelled = false;

    async function loadMembers() {
      try {
        const nextMembers = await requestMembers();

        if (!isCancelled) {
          setMembers(nextMembers);
        }
      } catch (error) {
        if (!isCancelled) {
          setNotice({
            tone: 'error',
            message: getErrorMessage(error, 'Unable to load members right now.'),
          });
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMembers();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return members;
    }

    return members.filter((member) =>
      `${member.member_code} ${member.name} ${member.phone ?? ''}`.toLowerCase().includes(query),
    );
  }, [deferredSearch, members]);

  function openAddModal() {
    setEditingMember(null);
    setFormData(createEmptyForm());
    setShowModal(true);
  }

  function openEditModal(member: Member) {
    setEditingMember(member);
    setFormData({
      member_code: member.member_code,
      name: member.name,
      phone: member.phone ?? '',
      address: member.address ?? '',
      joined_date: member.joined_date,
      notes: member.notes ?? '',
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingMember(null);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setNotice(null);

    try {
      const url = editingMember ? `/api/members/${editingMember.id}` : '/api/members';
      const method = editingMember ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to save member.');
      }

      setMembers(await requestMembers());
      setNotice({
        tone: 'success',
        message: editingMember ? 'Member details updated.' : 'Member added successfully.',
      });
      closeModal();
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, 'Unable to save member.'),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: number) {
    const shouldDelete = window.confirm('Delete this member? Existing collection or financial records will block removal.');
    if (!shouldDelete) {
      return;
    }

    setNotice(null);

    try {
      const response = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete member.');
      }

      setMembers((current) => current.filter((member) => member.id !== id));
      setNotice({ tone: 'success', message: 'Member deleted.' });
    } catch (error) {
      setNotice({
        tone: 'error',
        message: getErrorMessage(error, 'Unable to delete member.'),
      });
    }
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div>
          <p className="eyebrow">Members</p>
          <h1 className="page-title">Manage supplier records</h1>
          <p className="page-description">
            Keep member profiles clean so collection, balance, and request workflows all line up correctly.
          </p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary">
          Add Member
        </button>
      </section>

      {notice && <div className={`notice notice-${notice.tone}`}>{notice.message}</div>}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Supplier directory</h2>
            <p className="panel-description">{members.length} members currently registered</p>
          </div>
        </div>

        <div className="toolbar">
          <input
            type="text"
            placeholder="Search by code, name, or phone..."
            className="form-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Joined</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => (
                <tr key={member.id}>
                  <td className="font-bold">{member.member_code}</td>
                  <td>{member.name}</td>
                  <td>{member.phone || '-'}</td>
                  <td>{formatDate(member.joined_date)}</td>
                  <td>{member.notes || '-'}</td>
                  <td>
                    <div className="table-actions">
                      <button onClick={() => openEditModal(member)} className="text-link">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(member.id)} className="text-link danger">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!isLoading && filteredMembers.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    No members matched your search.
                  </td>
                </tr>
              )}

              {isLoading && (
                <tr>
                  <td colSpan={6} className="table-empty">
                    Loading members...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="modal-backdrop" role="presentation" onClick={closeModal}>
          <div className="modal-card" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <div>
                <p className="eyebrow">{editingMember ? 'Update member' : 'New member'}</p>
                <h2 className="panel-title">{editingMember ? 'Edit supplier profile' : 'Create supplier profile'}</h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="form-stack">
              <div className="form-grid form-grid-two">
                <div className="form-group">
                  <label className="form-label">Member code</label>
                  <input
                    required
                    name="member_code"
                    value={formData.member_code}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Joined date</label>
                  <input
                    required
                    type="date"
                    name="joined_date"
                    value={formData.joined_date}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Full name</label>
                <input required name="name" value={formData.name} onChange={handleInputChange} className="form-input" />
              </div>

              <div className="form-grid form-grid-two">
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input name="phone" value={formData.phone} onChange={handleInputChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="form-input" rows={4} />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingMember ? 'Save Changes' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

async function requestMembers() {
  const response = await fetch('/api/members');
  const payload = (await response.json()) as Member[] | { error?: string };

  if (!response.ok) {
    throw new Error('error' in payload ? payload.error || 'Unable to fetch members.' : 'Unable to fetch members.');
  }

  return Array.isArray(payload) ? payload : [];
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
