import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useOrg } from '../../context/OrgContext';
import { uploadAPI } from '../../services/api';
import { compressImage } from '../../services/compress';
import toast from 'react-hot-toast';
import { LuSave } from 'react-icons/lu';
import {
  Page, PageHeader, Surface, FormGrid, Field, Input, Button,
} from '../../components/ui';

const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:9898` : window.location.origin);

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('/uploads/')) {
    const apiURL = process.env.REACT_APP_API_URL;
    if (apiURL) {
      const base = apiURL.endsWith('/api') ? apiURL : (apiURL.endsWith('/api/') ? apiURL.slice(0, -1) : `${apiURL}/api`);
      return `${base}${url}`;
    }
    if (window.location.port) {
      return `${window.location.protocol}//${window.location.hostname}:9898${url}`;
    } else {
      return `${window.location.origin}/api${url}`;
    }
  }
  return url;
};


const OptionalFeature = () => {
  const { settings, updateSettings, reloadSettings } = useOrg();
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // local states for settings
  const [brandName, setBrandName] = useState('');
  const [brandSubtitle, setBrandSubtitle] = useState('');

  useEffect(() => {
    if (settings) {
      setLogoPreview(settings.logo || '');
      setBrandName(settings.brandName || '');
      setBrandSubtitle(settings.brandSubtitle || '');
    }
  }, [settings]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveLogo = async (e) => {
    e.preventDefault();
    if (!logoFile && logoPreview === settings.logo) {
      toast.error('No changes to save');
      return;
    }

    setSaving(true);
    let uploadedLogoUrl = settings.logo;

    try {
      if (logoFile) {
        setUploading(true);
        const compressedFile = await compressImage(logoFile);
        const formData = new FormData();
        formData.append('file', compressedFile);

        const uploadRes = await uploadAPI.uploadFile(formData);
        if (uploadRes.data && uploadRes.data.success) {
          uploadedLogoUrl = uploadRes.data.fileUrl;
        } else {
          throw new Error('Upload failed');
        }
        setUploading(false);
      }

      await updateSettings({
        ...settings,
        brandName,
        brandSubtitle,
        logo: uploadedLogoUrl
      });

      toast.success('Organization branding settings updated successfully!');
      reloadSettings();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to update organization logo');
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  /** An uploaded artwork needs a light plate behind it; an emoji does not. */
  const isImageLogo = !!logoPreview
    && (logoPreview.startsWith('http') || logoPreview.startsWith('/') || logoPreview.startsWith('data:') || logoPreview.startsWith('blob:'))
    && !logoPreview.includes('logo.png');

  return (
    <DashboardLayout pageTitle="Optional Feature">
      <Page>
        <PageHeader
          title="Optional Feature"
          subtitle="Customize your organization's logo and details dynamically. The uploaded logo will display instantly in the top navigation bar."
        />

        <form onSubmit={handleSaveLogo} className="fade-in-up">
          <Surface style={{ padding: 20, maxWidth: 900 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'stretch' }}>

              {/* Form Controls */}
              <div style={{ flex: '999 1 300px', minWidth: 0 }}>
                <FormGrid>
                  <Field label="Organization Name" required span="all">
                    <Input
                      value={brandName}
                      onChange={e => setBrandName(e.target.value)}
                      placeholder="Enter Organization name"
                      required
                    />
                  </Field>

                  <Field label="Subtitle / Slogan" span="all">
                    <Input
                      value={brandSubtitle}
                      onChange={e => setBrandSubtitle(e.target.value)}
                      placeholder="Enter subtitle"
                    />
                  </Field>

                  <Field
                    label="Upload Logo"
                    span="all"
                    hint={logoFile ? logoFile.name : 'PNG, JPG or SVG — square artwork works best.'}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px dashed var(--border-strong)',
                        borderRadius: 'var(--radius-md)',
                        padding: 10,
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        width: '100%',
                        fontSize: 'var(--fs-sm)',
                      }}
                    />
                  </Field>
                </FormGrid>
              </div>

              {/* Logo Preview Panel */}
              <div style={{
                flex: '1 1 220px',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 14,
                background: 'var(--bg-subtle)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
              }}>
                <span style={{
                  fontSize: 'var(--fs-2xs)',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}>
                  Logo Preview
                </span>

                <div style={{
                  width: 116,
                  height: 116,
                  borderRadius: 'var(--radius-2xl)',
                  background: isImageLogo ? 'var(--bg-card)' : 'var(--primary)',
                  border: isImageLogo ? '1px solid var(--border)' : 'none',
                  color: 'var(--on-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                  padding: isImageLogo ? 12 : 0,
                }}>
                  {logoPreview ? (
                    logoPreview.startsWith('http') || logoPreview.startsWith('/') || logoPreview.startsWith('data:') || logoPreview.startsWith('blob:') ? (
                      <img src={getImageUrl(logoPreview)} alt="Logo Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: '3.2rem' }}>{logoPreview}</span>
                    )
                  ) : (
                    <span style={{ fontSize: '3.2rem' }}>🏭</span>
                  )}
                </div>

                <span style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  wordBreak: 'break-word',
                  minWidth: 0,
                }}>
                  {logoFile ? logoFile.name : 'Using current logo'}
                </span>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
              flexWrap: 'wrap',
            }}>
              <Button
                type="submit"
                variant="primary"
                icon={<LuSave />}
                disabled={saving || uploading}
              >
                {uploading ? 'Uploading Logo...' : saving ? 'Saving changes...' : 'Save Configuration'}
              </Button>
            </div>
          </Surface>
        </form>
      </Page>
    </DashboardLayout>
  );
};

export default OptionalFeature;
