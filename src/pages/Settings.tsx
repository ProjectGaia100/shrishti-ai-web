import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { useToast } from '@/hooks/use-toast';
import { apiKeyService, APIKey, CreateKeyResponse, APICosts } from '@/services/apiKeys';

// ============================================================================
// Reusable Components
// ============================================================================

interface SettingToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}

function SettingToggle({ label, description, checked, onChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
          checked ? 'bg-primary' : 'bg-muted'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

interface SettingSelectProps {
  label: string;
  description: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}

function SettingSelect({ label, description, value, options, onChange }: SettingSelectProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-1 bg-muted/50 border border-border rounded-xl overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              value === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

interface TabProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

function Tab({ active, onClick, children, icon }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

// ============================================================================
// General Settings Tab
// ============================================================================

function GeneralSettingsTab({ user }: { user: any }) {
  const [tempUnit, setTempUnit] = useState('celsius');
  const [precipUnit, setPrecipUnit] = useState('mm');
  const [notifications, setNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div className="space-y-8">
      {/* Units & Measurements */}
      <div className="bg-background border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Units & Measurements</h2>
            <p className="text-xs text-muted-foreground">Configure data display units</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <SettingSelect
            label="Temperature"
            description="Choose temperature display unit"
            value={tempUnit}
            options={[
              { label: '°C', value: 'celsius' },
              { label: '°F', value: 'fahrenheit' },
            ]}
            onChange={setTempUnit}
          />
          <SettingSelect
            label="Precipitation"
            description="Choose precipitation measurement unit"
            value={precipUnit}
            options={[
              { label: 'mm', value: 'mm' },
              { label: 'inches', value: 'inches' },
            ]}
            onChange={setPrecipUnit}
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-background border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            <p className="text-xs text-muted-foreground">Theme and visual preferences</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <SettingToggle
            label="High Contrast"
            description="Increase contrast for better readability"
            checked={highContrast}
            onChange={setHighContrast}
          />
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-background border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Notifications & Alerts</h2>
            <p className="text-xs text-muted-foreground">Manage alert preferences</p>
          </div>
        </div>

        <div className="divide-y divide-border">
          <SettingToggle
            label="Push Notifications"
            description="Receive disaster and weather alert notifications"
            checked={notifications}
            onChange={setNotifications}
          />
          <SettingToggle
            label="Sound Alerts"
            description="Play sound for critical alerts"
            checked={soundAlerts}
            onChange={setSoundAlerts}
          />
          <SettingToggle
            label="Auto-Refresh Data"
            description="Automatically refresh satellite data and predictions"
            checked={autoRefresh}
            onChange={setAutoRefresh}
          />
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-background border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Profile</h2>
            <p className="text-xs text-muted-foreground">Your account information</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold shadow-sm">
            {user?.name?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="space-y-1">
            <p className="text-foreground font-medium">{user?.name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground">{user?.email || 'admin@gmail.com'}</p>
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-400" />
              Active
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// API Keys Tab
// ============================================================================

function APIKeysTab() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyResult, setNewKeyResult] = useState<CreateKeyResponse | null>(null);
  const [costs, setCosts] = useState<APICosts | null>(null);

  useEffect(() => {
    loadKeys();
    loadCosts();
  }, []);

  const loadKeys = async () => {
    try {
      setLoading(true);
      const data = await apiKeyService.listKeys();
      setKeys(data);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load API keys',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCosts = async () => {
    try {
      const data = await apiKeyService.getCosts();
      setCosts(data);
    } catch (err) {
      console.error('Failed to load costs:', err);
    }
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast({ title: 'Error', description: 'Please enter a key name', variant: 'destructive' });
      return;
    }

    try {
      setCreating(true);
      const result = await apiKeyService.createKey(newKeyName.trim());
      setNewKeyResult(result);
      setNewKeyName('');
      loadKeys();
      toast({ title: 'Success', description: 'API key created successfully' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) return;

    try {
      await apiKeyService.deleteKey(keyId);
      loadKeys();
      toast({ title: 'Success', description: 'API key deleted' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete API key',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'API key copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage your API keys for programmatic access to Shrishti AI
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create New Key
        </button>
      </div>

      {/* Costs Info */}
      {costs && (
        <div className="bg-muted/30 border border-border rounded-xl p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">API Credit Costs</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(costs).map(([key, cost]) => (
              <div key={key} className="bg-background border border-border rounded-lg px-3 py-2 text-center">
                <div className="text-xs text-muted-foreground capitalize">{key.replace('_', ' ')}</div>
                <div className="text-sm font-semibold text-primary">{cost} credits</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <h3 className="text-sm font-medium text-foreground">Your API Keys</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">No API keys yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first key to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((key) => (
              <div key={key.id} className="p-4 hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{key.name}</span>
                      {!key.is_active && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded">
                          Revoked
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">
                        {key.key_prefix}••••••••••••
                      </code>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                      <span>Usage: {key.usage_count} calls</span>
                      <span>Credits: {key.credits_consumed}</span>
                      {key.last_used_at && (
                        <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-2 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete key"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md bg-background border border-border rounded-2xl shadow-xl">
            <div className="p-6">
              {newKeyResult ? (
                <>
                  <div className="text-center mb-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">API Key Created</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Copy this key now - it won't be shown again!
                    </p>
                  </div>

                  <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono text-foreground break-all">
                        {newKeyResult.api_key}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newKeyResult.api_key)}
                        className="flex-shrink-0 p-2 hover:bg-muted rounded transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setNewKeyResult(null);
                      setShowCreateModal(false);
                    }}
                    className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Create API Key</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Key Name
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Production Server"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        A friendly name to identify this key
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={creating}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                    >
                      {creating ? 'Creating...' : 'Create Key'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Documentation Tab
// ============================================================================

function DocumentationTab() {
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedEndpoint(id);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const endpoints = [
    {
      id: 'hazardguard',
      method: 'POST',
      path: '/v1/models/hazardguard/predict',
      description: 'Predict landslide risk for a given location',
      cost: 10,
      request: `{
  "lat": 15.4989,
  "lon": 73.8278
}`,
      response: `{
  "success": true,
  "data": {
    "risk_level": "medium",
    "probability": 0.45,
    "factors": { ... }
  },
  "credits_charged": 10,
  "credits_remaining": 990
}`,
    },
    {
      id: 'weatherwise',
      method: 'POST',
      path: '/v1/models/weatherwise/predict',
      description: 'Weather-based disaster risk assessment',
      cost: 10,
      request: `{
  "lat": 15.4989,
  "lon": 73.8278
}`,
      response: `{
  "success": true,
  "data": {
    "forecast": { ... },
    "risk_assessment": { ... }
  },
  "credits_charged": 10
}`,
    },
    {
      id: 'geovision',
      method: 'POST',
      path: '/v1/models/geovision/predict',
      description: 'Multi-modal geospatial fusion analysis',
      cost: 15,
      request: `{
  "lat": 15.4989,
  "lon": 73.8278
}`,
      response: `{
  "success": true,
  "data": {
    "analysis": { ... },
    "recommendations": [ ... ]
  },
  "credits_charged": 15
}`,
    },
    {
      id: 'data-layers',
      method: 'GET',
      path: '/v1/data-layers/{layer_id}',
      description: 'Fetch geospatial data layer for a bounding box',
      cost: 5,
      request: `# Query parameters
?bbox=73.5,15.2,74.0,15.8
&format=json

# Available layers:
# ndvi, elevation, nightlights, landcover, temperature`,
      response: `{
  "success": true,
  "data": {
    "layer_id": "ndvi",
    "bbox": [73.5, 15.2, 74.0, 15.8],
    "tile_url": "/api/raster/ndvi/tiles/{z}/{x}/{y}.png"
  }
}`,
    },
    {
      id: 'chat',
      method: 'POST',
      path: '/v1/chat',
      description: 'AI assistant for geospatial queries',
      cost: 10,
      request: `{
  "message": "What areas in Goa are most prone to landslides?",
  "context": {
    "lat": 15.4989,
    "lon": 73.8278
  }
}`,
      response: `{
  "success": true,
  "data": {
    "response": "Based on terrain analysis...",
    "sources": [ ... ]
  },
  "credits_charged": 10
}`,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="bg-background border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">API Overview</h2>
        <p className="text-sm text-muted-foreground mb-4">
          The Shrishti AI API provides programmatic access to disaster prediction models, 
          geospatial data layers, and an AI chatbot. All requests require authentication 
          via an API key.
        </p>

        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-2">Base URL</h3>
          <code className="text-sm bg-background px-2 py-1 rounded border border-border">
            {window.location.origin}/v1
          </code>
        </div>
      </div>

      {/* Authentication */}
      <div className="bg-background border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Authentication</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Include your API key in the <code className="bg-muted px-1.5 py-0.5 rounded text-xs">X-API-Key</code> header 
          with every request.
        </p>

        <div className="bg-zinc-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-zinc-100 font-mono">
{`curl -X POST \\
  ${window.location.origin}/v1/models/hazardguard/predict \\
  -H "X-API-Key: sk_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"lat": 15.4989, "lon": 73.8278}'`}
          </pre>
        </div>
      </div>

      {/* Endpoints */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Endpoints</h2>

        {endpoints.map((endpoint) => (
          <div key={endpoint.id} className="bg-background border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                  endpoint.method === 'GET' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
                }`}>
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-foreground">{endpoint.path}</code>
              </div>
              <span className="text-xs text-muted-foreground">{endpoint.cost} credits</span>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">{endpoint.description}</p>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Request</span>
                  <button
                    onClick={() => copyCode(endpoint.request, `${endpoint.id}-req`)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copiedEndpoint === `${endpoint.id}-req` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-zinc-900 rounded-lg p-3 text-xs text-zinc-100 font-mono overflow-x-auto">
                  {endpoint.request}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground">Response</span>
                  <button
                    onClick={() => copyCode(endpoint.response, `${endpoint.id}-res`)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {copiedEndpoint === `${endpoint.id}-res` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-zinc-900 rounded-lg p-3 text-xs text-zinc-100 font-mono overflow-x-auto">
                  {endpoint.response}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Python Example */}
      <div className="bg-background border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Python Example</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Quick start example using Python and the requests library.
        </p>

        <div className="bg-zinc-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-zinc-100 font-mono">
{`import requests

API_KEY = "sk_live_your_api_key_here"
BASE_URL = "${window.location.origin}/v1"

def predict_hazard(lat, lon):
    response = requests.post(
        f"{BASE_URL}/models/hazardguard/predict",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json"
        },
        json={"lat": lat, "lon": lon}
    )
    return response.json()

# Example usage
result = predict_hazard(15.4989, 73.8278)
print(f"Risk Level: {result['data']['risk_level']}")
print(f"Credits Remaining: {result['credits_remaining']}")`}
          </pre>
        </div>
      </div>

      {/* Error Codes */}
      <div className="bg-background border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Error Codes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-foreground">Code</th>
                <th className="text-left py-2 font-medium text-foreground">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-2 pr-4"><code className="text-red-500">401</code></td>
                <td className="py-2 text-muted-foreground">Invalid or missing API key</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="text-red-500">403</code></td>
                <td className="py-2 text-muted-foreground">Insufficient permissions or credits</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="text-red-500">429</code></td>
                <td className="py-2 text-muted-foreground">Rate limit exceeded</td>
              </tr>
              <tr>
                <td className="py-2 pr-4"><code className="text-red-500">500</code></td>
                <td className="py-2 text-muted-foreground">Internal server error</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Credits Info */}
      <div className="bg-background border border-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Credits</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Each API call consumes credits from your account. Check your balance anytime:
        </p>

        <div className="bg-zinc-900 rounded-lg p-4 overflow-x-auto mb-4">
          <pre className="text-sm text-zinc-100 font-mono">
{`GET /v1/credits/balance
X-API-Key: sk_live_your_api_key_here`}
          </pre>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-foreground">10</div>
            <div className="text-xs text-muted-foreground">HazardGuard</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-foreground">10</div>
            <div className="text-xs text-muted-foreground">WeatherWise</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-foreground">15</div>
            <div className="text-xs text-muted-foreground">GeoVision</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-foreground">5</div>
            <div className="text-xs text-muted-foreground">Data Layers</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-foreground">10</div>
            <div className="text-xs text-muted-foreground">Chatbot</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Settings Page
// ============================================================================

export default function Settings() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'api-keys' | 'docs'>('general');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
          <UserMenu />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-16">
        {/* Header */}
        <div className="space-y-2 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and API access</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <div className="flex gap-1">
            <Tab
              active={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              General
            </Tab>
            <Tab
              active={activeTab === 'api-keys'}
              onClick={() => setActiveTab('api-keys')}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                </svg>
              }
            >
              API Keys
            </Tab>
            <Tab
              active={activeTab === 'docs'}
              onClick={() => setActiveTab('docs')}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              }
            >
              API Documentation
            </Tab>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' && <GeneralSettingsTab user={user} />}
        {activeTab === 'api-keys' && <APIKeysTab />}
        {activeTab === 'docs' && <DocumentationTab />}
      </div>
    </div>
  );
}
