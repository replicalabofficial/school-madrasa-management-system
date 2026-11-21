import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { settingsApi } from '../../api/settingsApi'
import { branchesApi } from '../../api/branchesApi'
import { branchModuleAccessApi } from '../../api/branchModuleAccessApi'
import { useAuthStore } from '../../stores/authStore'
import { TOGGLEABLE_MODULES } from '../../types/branchModuleAccess'
import { API_ORIGIN, type ApiErrorPayload } from '../../api/client'
import type { SystemSetting, UpdateSystemSettingPayload } from '../../types/settings'

interface FormValues {
    institutionName: string
    address: string
    academicSession: string
}

const emptyForm: FormValues = {
    institutionName: '',
    address: '',
    academicSession: '',
}

export function SettingsPage() {
    const queryClient = useQueryClient()
    const user = useAuthStore((state) => state.user)
    const isHeadOffice = user?.role === 'HeadOfficeAdmin'

    const [formValues, setFormValues] = useState<FormValues>(emptyForm)
    const [formError, setFormError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const [selectedBranchId, setSelectedBranchId] = useState<number | ''>('')

    const settingsQuery = useQuery<SystemSetting, ApiErrorPayload>({
        queryKey: ['settings'],
        queryFn: settingsApi.get,
        retry: false,
    })

    useEffect(() => {
        if (settingsQuery.data) {
            setFormValues({
                institutionName: settingsQuery.data.institutionName,
                address: settingsQuery.data.address ?? '',
                academicSession: settingsQuery.data.academicSession,
            })
        }
    }, [settingsQuery.data])

    const initializeMutation = useMutation({
        mutationFn: settingsApi.initialize,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
    })

    const updateMutation = useMutation({
        mutationFn: settingsApi.update,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            setSaved(true)
            setTimeout(() => setSaved(false), 2500)
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to update settings.'),
    })
    const [logoFile, setLogoFile] = useState<File | null>(null)

    const logoMutation = useMutation({
        mutationFn: settingsApi.uploadLogo,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] })
            setLogoFile(null)
        },
        onError: (err) => setFormError((err as ApiErrorPayload).message ?? 'Failed to upload logo.'),
    })

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setFormError(null)

        if (!formValues.institutionName.trim() || !formValues.academicSession.trim()) {
            setFormError('Institution name and academic session are required.')
            return
        }

        const payload: UpdateSystemSettingPayload = {
            institutionName: formValues.institutionName.trim(),
            address: formValues.address.trim() || null,
            phone: settingsQuery.data?.phone ?? null,
            email: settingsQuery.data?.email ?? null,
            currency: settingsQuery.data?.currency ?? 'PKR',
            dateFormat: settingsQuery.data?.dateFormat ?? 'dd/MM/yyyy',
            academicSession: formValues.academicSession.trim(),
            logoPath: settingsQuery.data?.logoPath ?? null,
            isActive: settingsQuery.data?.isActive ?? true,
        }

        updateMutation.mutate(payload)
    }

    const branchesQuery = useQuery({
        queryKey: ['branches'],
        queryFn: branchesApi.getAll,
        enabled: isHeadOffice,
    })

    const moduleStatesQuery = useQuery({
        queryKey: ['branch-module-access', selectedBranchId],
        queryFn: () => branchModuleAccessApi.getStates(Number(selectedBranchId)),
        enabled: isHeadOffice && selectedBranchId !== '',
    })

    const toggleMutation = useMutation({
        mutationFn: ({ moduleKey, isEnabled }: { moduleKey: string; isEnabled: boolean }) =>
            branchModuleAccessApi.setState(Number(selectedBranchId), moduleKey, isEnabled),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['branch-module-access', selectedBranchId] })
        },
    })

    const activeBranches = (branchesQuery.data ?? []).filter((b) => b.isActive)

    if (settingsQuery.isLoading) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2 text-sm">Loading settings...</span>
            </div>
        )
    }

    if (settingsQuery.error && settingsQuery.error.status !== 404) {
        return (
            <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                <div>
                    <p className="text-sm font-semibold text-red-700">Could not load settings</p>
                    <p className="mt-1 text-sm text-red-600">{settingsQuery.error.message}</p>
                </div>
            </Card>
        )
    }

    if (settingsQuery.error?.status === 404) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                    <p className="mt-1 text-sm text-slate-500">System settings have not been set up yet.</p>
                </div>

                {isHeadOffice ? (
                    <Card className="p-6">
                        <p className="text-sm text-slate-600">
                            No settings record exists yet. Create the default settings to get started.
                        </p>
                        <Button
                            className="mt-4"
                            onClick={() => initializeMutation.mutate()}
                            disabled={initializeMutation.isPending}
                        >
                            {initializeMutation.isPending ? 'Initializing...' : 'Initialize Settings'}
                        </Button>
                    </Card>
                ) : (
                    <Card className="p-6">
                        <p className="text-sm text-slate-500">Please contact your Head Office administrator.</p>
                    </Card>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
                <p className="mt-1 text-sm text-slate-500">
                    {isHeadOffice ? 'Manage institution-wide settings.' : 'View institution settings.'}
                </p>
            </div>

            <Card className="max-w-xl p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                            {formError}
                        </div>
                    )}

                    {saved && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">
                            Settings saved successfully.
                        </div>
                    )}

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Institution Name</label>
                        <Input
                            value={formValues.institutionName}
                            onChange={(e) => setFormValues((v) => ({ ...v, institutionName: e.target.value }))}
                            disabled={!isHeadOffice}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Address</label>
                        <Input
                            value={formValues.address}
                            onChange={(e) => setFormValues((v) => ({ ...v, address: e.target.value }))}
                            disabled={!isHeadOffice}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Academic Session</label>
                        <Input
                            value={formValues.academicSession}
                            onChange={(e) => setFormValues((v) => ({ ...v, academicSession: e.target.value }))}
                            disabled={!isHeadOffice}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Organization Logo</label>
                        {settingsQuery.data?.logoPath && (
                            <img
                                src={`${API_ORIGIN}${settingsQuery.data.logoPath}`}
                                alt="Organization logo"
                                className="mb-3 h-16 w-16 rounded-lg border border-slate-200 object-contain"
                            />
                        )}
                        {isHeadOffice && (
                            <div className="flex items-center gap-3">
                                <input
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.svg"
                                    onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                                    className="text-sm text-slate-600"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => logoFile && logoMutation.mutate(logoFile)}
                                    disabled={!logoFile || logoMutation.isPending}
                                >
                                    {logoMutation.isPending ? 'Uploading...' : 'Upload'}
                                </Button>
                            </div>
                        )}
                    </div>

                    {isHeadOffice && (
                        <div className="flex justify-end pt-2">
                            <Button type="submit" disabled={updateMutation.isPending}>
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    )}
                </form>
            </Card>

            {isHeadOffice && (
                <Card className="max-w-xl p-6">
                    <h2 className="text-base font-semibold text-slate-900">Branch Module Access</h2>
                    <p className="mt-1 text-sm text-slate-500">
                        Choose which modules each branch can see and use.
                    </p>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Branch</label>
                        <select
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value ? Number(e.target.value) : '')}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        >
                            <option value="">Select a branch</option>
                            {activeBranches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedBranchId !== '' && (
                        <div className="mt-5 space-y-3">
                            {moduleStatesQuery.isLoading && (
                                <div className="flex items-center text-slate-400">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="ml-2 text-sm">Loading module access...</span>
                                </div>
                            )}

                            {moduleStatesQuery.data &&
                                TOGGLEABLE_MODULES.map((module) => {
                                    const isEnabled = moduleStatesQuery.data![module.key] ?? true

                                    return (
                                        <div
                                            key={module.key}
                                            className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                                        >
                                            <span className="text-sm font-medium text-slate-700">{module.label}</span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    toggleMutation.mutate({
                                                        moduleKey: module.key,
                                                        isEnabled: !isEnabled,
                                                    })
                                                }
                                                disabled={toggleMutation.isPending}
                                                className={
                                                    isEnabled
                                                        ? 'relative h-6 w-11 rounded-full bg-emerald-600 transition-colors'
                                                        : 'relative h-6 w-11 rounded-full bg-slate-300 transition-colors'
                                                }
                                            >
                                                <span
                                                    className={
                                                        isEnabled
                                                            ? 'absolute left-6 top-0.5 h-5 w-5 rounded-full bg-white transition-all'
                                                            : 'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-all'
                                                    }
                                                />
                                            </button>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </Card>
            )}
        </div>
    )
}