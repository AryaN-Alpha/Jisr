import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Upload,
  Settings,
  BarChart3,
  Save,
  Plus,
  Edit,
  Trash2,
  Volume2,
  Languages,
  Users,
  Image as ImageIcon,
  MapPin
} from 'lucide-react'
import DashboardLayout from '../layouts/DashboardLayout'
import { VocabularyItem, AACSettings, VocabularyLevel, Language, VocabularyCategory, Location, LocationType } from '../types/aac'
import { vocabularyService } from '../services/vocabularyService'
import { settingsService, AACSettings as BackendAACSettings } from '../services/settingsService'
import { analyticsService } from '../services/analyticsService'
import { aacService } from '../services/aacService'
import { publicMediaService, MediaAsset, MEDIA_CATEGORIES } from '../services/adminService'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import Toast from '../components/Toast'
import { categoryLabels, levelLabels } from '../data/vocabularyData'
import { useLanguage } from '../context/LanguageContext'
import { useChild } from '../context/ChildContext'
import { tr, t } from '../i18n/translations'

function parseVocabText(text: unknown): { en: string; ar: string } {
  const empty = { en: '', ar: '' }
  if (text && typeof text === 'object' && !Array.isArray(text)) {
    const o = text as Record<string, string>
    return { en: o.en ?? '', ar: o.ar ?? '' }
  }
  if (typeof text === 'string') {
    try {
      const p = JSON.parse(text)
      if (p && typeof p === 'object' && !Array.isArray(p)) {
        const o = p as Record<string, string>
        return { en: o.en ?? '', ar: o.ar ?? '' }
      }
      return { en: text, ar: '' }
    } catch {
      return { en: text, ar: '' }
    }
  }
  return empty
}

export default function AACCustomization() {
  const { language } = useLanguage()
  const isAr = language === 'ar'
  const { children, loading: childrenLoading } = useChild()
  const loadDataSeqRef = useRef(0)
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as 'vocabulary' | 'settings' | 'analytics' | 'locations' | null
  const [activeTab, setActiveTab] = useState<'vocabulary' | 'settings' | 'analytics' | 'locations'>(
    tabParam && ['vocabulary', 'settings', 'analytics', 'locations'].includes(tabParam) ? tabParam : 'vocabulary'
  )

  useEffect(() => {
    if (tabParam && ['vocabulary', 'settings', 'analytics', 'locations'].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tab: 'vocabulary' | 'settings' | 'analytics' | 'locations') => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([])
  const [childVocabulary, setChildVocabulary] = useState<VocabularyItem[]>([])
  const [settings, setSettings] = useState<AACSettings | null>(null)
  const [analytics, setAnalytics] = useState<any>(null)
  const [locations, setLocations] = useState<Location[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [deletingLocation, setDeletingLocation] = useState<string | null>(null)
  const [childId, setChildId] = useState<string | null>(null)

  const loading = childrenLoading || dataLoading
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
    title?: string
    visible: boolean
  }>({ message: '', type: 'info', visible: false })

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    title?: string
  ) => {
    setToast({ message, type, title, visible: true })
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 5000)
  }

  // Sync selected child from shared context
  useEffect(() => {
    if (childrenLoading) return
    if (children.length === 0) {
      setChildId(null)
      return
    }
    setChildId((prev) => {
      if (prev && children.some((c) => c.id === prev)) return prev
      return children[0].id
    })
  }, [children, childrenLoading])

  const loadData = useCallback(async () => {
    if (!childId) return

    const seq = ++loadDataSeqRef.current
    try {
      setDataLoading(true)
      const [vocab, childVocab, settingsData, analyticsData, locationsData] = await Promise.all([
        vocabularyService.getAllVocabulary().catch(() => []),
        vocabularyService.getChildVocabulary(childId).catch(() => []),
        settingsService.getSettings(childId).catch(() => null),
        analyticsService.getAnalytics(childId).catch(() => null),
        aacService.getLocations(childId).catch(() => [])
      ])
      if (seq !== loadDataSeqRef.current) return

      // Map backend vocabulary to frontend format
      const mappedVocab = vocab.map(v => ({
        id: v.id,
        text: parseVocabText(v.text),
        category: v.category as VocabularyCategory,
        level: v.level.toLowerCase() as VocabularyLevel,
        image: v.imageUrl || '',
        audioUrl: v.audioUrl || undefined,
        locations: (v as any).locations || [],
        order: v.order,
        enabled: v.enabled,
        userId: (v as any).userId ?? null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }))

      const mappedChildVocab = childVocab.map(v => ({
        id: v.id,
        text: parseVocabText(v.text),
        category: v.category as VocabularyCategory,
        level: v.level.toLowerCase() as VocabularyLevel,
        image: v.imageUrl || '',
        audioUrl: v.audioUrl || undefined,
        locations: (v as any).locations || [],
        order: v.order,
        enabled: v.enabled,
        userId: (v as any).userId ?? null,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt
      }))

      setVocabulary(mappedVocab)
      setChildVocabulary(mappedChildVocab)

      // Map backend settings to frontend format
      if (settingsData) {
        setSettings({
          id: settingsData.id,
          childId: settingsData.childId,
          primaryLanguage: settingsData.primaryLanguage as Language,
          secondaryLanguage: settingsData.secondaryLanguage as Language | undefined,
          voiceType: settingsData.voiceType as 'child' | 'adult' | 'neutral',
          speechSpeed: settingsData.speechSpeed,
          volume: settingsData.volume,
          maxSentenceLength: settingsData.maxSentenceLength,
          visibleImageCount: settingsData.visibleImageCount,
          vocabularyLevel: settingsData.vocabularyLevel.toLowerCase() as VocabularyLevel,
          speechMode: settingsData.speechMode
            ? String(settingsData.speechMode).toLowerCase() as 'instant' | 'sentence'
            : undefined,
          createdAt: settingsData.createdAt,
          updatedAt: settingsData.updatedAt
        })
      }

      // Map analytics
      if (analyticsData) {
        const recentList = analyticsData.recentAnalytics || []

        const avgLength =
          recentList.length > 0
            ? recentList.reduce((sum: number, a: any) => sum + (a.vocabularyIds?.length || 0), 0) / recentList.length
            : 0

        // Build 12 two-hour time slots (0:00, 2:00, … 22:00)
        const hourSlots: Record<number, number> = {}
        for (let h = 0; h < 12; h++) hourSlots[h * 2] = 0
        recentList.forEach((a: any) => {
          const hour = new Date(a.timestamp).getHours()
          const slot = Math.floor(hour / 2) * 2
          if (slot in hourSlots) hourSlots[slot]++
        })

        setAnalytics({
          totalSentences: analyticsData.totalUsages,
          averageSentenceLength: avgLength,
          sentenceFrequency: Object.values(analyticsData.dailyUsage).reduce((sum: number, count: any) => sum + count, 0),
          mostUsedImages: analyticsData.mostUsed.map((mu: any) => ({
            vocabulary: mappedVocab.find((v: any) => v.id === mu.vocabularyId),
            count: mu.count
          })).filter((item: any) => item.vocabulary),
          usageTimePatterns: Object.entries(hourSlots).map(([hour, count]) => ({
            hour: Number(hour),
            count,
          })),
        })
      }
      // Map locations from DB
      setLocations(locationsData || [])
    } catch (error) {
      if (seq !== loadDataSeqRef.current) return
      console.error('Failed to load data:', error)
      setLocations([])
      setVocabulary([])
      setChildVocabulary([])
    } finally {
      if (seq === loadDataSeqRef.current) setDataLoading(false)
    }
  }, [childId])

  useEffect(() => {
    if (childId) {
      void loadData()
    }
  }, [childId, loadData])

  const handleSaveSettings = async () => {
    if (!settings || !childId) return
    try {
      await settingsService.updateSettings(childId, {
        primaryLanguage: settings.primaryLanguage,
        secondaryLanguage: settings.secondaryLanguage || undefined,
        voiceType: settings.voiceType,
        speechSpeed: settings.speechSpeed,
        volume: settings.volume,
        maxSentenceLength: settings.maxSentenceLength,
        visibleImageCount: settings.visibleImageCount,
        vocabularyLevel: settings.vocabularyLevel.toUpperCase() as 'BASIC' | 'INTERMEDIATE' | 'ADVANCED',
        speechMode: settings.speechMode
          ? settings.speechMode.toUpperCase() as 'INSTANT' | 'SENTENCE'
          : undefined,
        gridColumns: settings.gridColumns ?? 4,
        cardSize: settings.cardSize ?? 'medium',
      })
      showToast('Settings saved successfully', 'success', 'Settings Saved')
      await loadData()
    } catch (error) {
      console.error('Failed to save settings:', error)
      showToast('Failed to save settings', 'error', 'Error')
    }
  }

  const handleAddVocabulary = async (item: Partial<VocabularyItem>) => {
    try {
      // Map frontend `image` → `imageUrl`, and lowercase level → uppercase for backend enum
      const payload: any = {
        ...item,
        imageUrl: (item as any).image,
        level: (item as any).level?.toUpperCase(),
      }
      delete payload.image
      const created = await vocabularyService.createVocabulary(payload)
      if (childId) {
        await vocabularyService.assignToChild(created.id, childId)
      }
      await loadData()
      setShowAddModal(false)
      showToast('Card created and added to your child\'s board', 'success', 'Card Created')
    } catch (error: any) {
      console.error('Failed to add vocabulary:', error)
      showToast(error.message || 'Failed to create card', 'error', 'Error')
    }
  }

  const handleUpdateVocabulary = async (id: string, updates: Partial<VocabularyItem>) => {
    try {
      // Map frontend `image` → `imageUrl`, and lowercase level → uppercase for backend enum
      const payload: any = {
        ...updates,
        imageUrl: (updates as any).image,
        level: (updates as any).level?.toUpperCase(),
      }
      delete payload.image
      await vocabularyService.updateVocabulary(id, payload)
      await loadData()
      setEditingItem(null)
      showToast('Card updated successfully', 'success', 'Card Updated')
    } catch (error: any) {
      console.error('Failed to update vocabulary:', error)
      showToast(error.message || 'Failed to update card', 'error', 'Error')
    }
  }

  const handleDeleteVocabulary = async (id: string) => {
    try {
      await vocabularyService.deleteVocabulary(id)
      await loadData()
      showToast('Card deleted from library', 'success', 'Card Deleted')
    } catch (error: any) {
      console.error('Failed to delete vocabulary:', error)
      showToast(error.message || 'Failed to delete card', 'error', 'Error')
    }
  }

  const handleAddCardToChild = async (vocabularyId: string) => {
    if (!childId) return
    try {
      await vocabularyService.assignToChild(vocabularyId, childId)
      await loadData()
      showToast('Card added to your child\'s board', 'success', 'Card Added')
    } catch (error: any) {
      console.error('Failed to add card to child:', error)
      showToast(error.message || 'Failed to add card', 'error', 'Error')
    }
  }

  const handleRemoveCardFromChild = async (vocabularyId: string) => {
    if (!childId) return
    try {
      await vocabularyService.unassignFromChild(vocabularyId, childId)
      await loadData()
      showToast('Card removed from child\'s board', 'success', 'Card Removed')
    } catch (error: any) {
      console.error('Failed to remove card from child:', error)
      showToast(error.message || 'Failed to remove card', 'error', 'Error')
    }
  }

  const handleSaveLocation = async (location: Location) => {
    if (!childId) return
    try {
      if (editingLocation) {
        const updated = await aacService.updateLocation(childId, location.id, location)
        setLocations(locations.map(l => l.id === location.id ? updated : l))
        showToast('Location updated successfully', 'success', 'Location Saved')
      } else {
        // Prevent duplicate names in state (API also checks)
        if (locations.some(l => l.name.toLowerCase() === location.name.toLowerCase())) {
          showToast('A location with this name already exists', 'warning', 'Duplicate Name')
          return
        }

        // Remove temporary ID to let DB generate one
        const { id, createdAt, updatedAt, ...locationData } = location as any
        const created = await aacService.addLocation(childId, locationData)
        setLocations([...locations, created])
        showToast('Location created successfully', 'success', 'Location Saved')
      }
      setShowLocationModal(false)
      setEditingLocation(null)
    } catch (error: any) {
      console.error('Failed to save location:', error)
      showToast(error.message || 'Failed to save location', 'error', 'Error')
    }
  }

  const handleDeleteLocation = async (locationId: string) => {
    if (!childId) return
    try {
      await aacService.deleteLocation(childId, locationId)
      setLocations(locations.filter(l => l.id !== locationId))
      setDeletingLocation(null)
      showToast('Location deleted successfully', 'success', 'Location Deleted')
    } catch (error: any) {
      console.error('Failed to delete location:', error)
      showToast(error.message || 'Failed to delete location', 'error', 'Error')
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg text-ink-600 dark:text-ink-300">{t(tr.common.loading, language)}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (children.length === 0) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-soft dark:border-ink-600 dark:bg-ink-800">
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">{t(tr.aac.noChildTitle, language)}</h1>
          <p className="mt-3 text-ink-600 dark:text-ink-300">
            {t(tr.aac.noChildDesc, language)}
          </p>
          <Link
            to="/family"
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-primary-700"
          >
            {t(tr.aac.goToChildren, language)}
          </Link>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.visible}
        onClose={() => setToast((prev) => ({ ...prev, visible: false }))}
        title={toast.title}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto"
      >
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-ink-900 dark:text-ink-50 mb-2">
                {t(tr.aac.title, language)}
              </h1>
              <p className="text-xl text-ink-600 dark:text-ink-300">
                {t(tr.aac.subtitle, language)}
              </p>
            </div>
            {children.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-2">
                  {t(tr.aac.selectChild, language)}
                </label>
                <select
                  value={childId || ''}
                  onChange={(e) => setChildId(e.target.value)}
                  className="px-4 py-2 rounded-lg border-2 border-ink-200 dark:border-ink-600 dark:bg-ink-800 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b-4 border-ink-200 dark:border-ink-600">
          {[
            { id: 'vocabulary', label: t(tr.aac.tabVocabulary, language), icon: ImageIcon },
            { id: 'locations', label: t(tr.aac.tabLocations, language), icon: MapPin },
            { id: 'settings', label: t(tr.aac.tabSettings, language), icon: Settings },
            { id: 'analytics', label: t(tr.aac.tabAnalytics, language), icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`
                  flex items-center space-x-2 px-6 py-3 font-bold text-lg
                  border-b-4 transition-colors
                  ${activeTab === tab.id
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-ink-50'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <VocabularyManagement
            vocabulary={vocabulary}
            childVocabulary={childVocabulary}
            locations={locations}
            onAdd={handleAddVocabulary}
            onUpdate={handleUpdateVocabulary}
            onDelete={handleDeleteVocabulary}
            onAddCardToChild={handleAddCardToChild}
            onRemoveCardFromChild={handleRemoveCardFromChild}
            showAddModal={showAddModal}
            setShowAddModal={setShowAddModal}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
          />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && settings && (
          <SettingsPanel
            settings={settings}
            onUpdate={setSettings}
            onSave={handleSaveSettings}
          />
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <LocationManagement
            locations={locations}
            onAdd={() => {
              setEditingLocation(null)
              setShowLocationModal(true)
            }}
            onEdit={(location: Location) => {
              setEditingLocation(location)
              setShowLocationModal(true)
            }}
            onDelete={(id: string) => setDeletingLocation(id)}
            onSave={handleSaveLocation}
            showModal={showLocationModal}
            onCloseModal={() => {
              setShowLocationModal(false)
              setEditingLocation(null)
            }}
            editingLocation={editingLocation}
            deletingLocation={deletingLocation}
            setDeletingLocation={setDeletingLocation}
            handleDeleteLocation={handleDeleteLocation}
            showToast={showToast}
          />
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          analytics
            ? <AnalyticsPanel analytics={analytics} />
            : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <BarChart3 className="h-12 w-12 text-ink-300 dark:text-ink-600 mb-4" />
                <h3 className="text-lg font-semibold text-ink-700 dark:text-ink-200">{t(tr.aac.noAnalytics, language)}</h3>
                <p className="mt-2 text-sm text-ink-500 dark:text-ink-400 max-w-sm">
                  {t(tr.aac.noAnalyticsDesc, language)}
                </p>
              </div>
            )
        )}
      </motion.div>
    </DashboardLayout>
  )
}

// Vocabulary Management Component
function VocabularyManagement({
  vocabulary,
  childVocabulary,
  locations,
  onAdd,
  onUpdate,
  onDelete,
  onAddCardToChild,
  onRemoveCardFromChild,
  showAddModal,
  setShowAddModal,
  editingItem,
  setEditingItem
}: any) {
  const { language } = useLanguage()
  const [confirmAction, setConfirmAction] = useState<{
    id: string
    type: 'remove-child' | 'delete-library'
    name: string
  } | null>(null)

  const initialVocabularyForm = () => ({
    image: '',
    imageFile: null as File | null,
    imagePreview: '',
    textEn: '',
    textAr: '',
    category: 'needs' as VocabularyCategory,
    level: 'basic' as VocabularyLevel,
    enabled: true,
    color: 'from-blue-400 to-blue-600',
    locations: [] as string[]
  })

  const [formData, setFormData] = useState(initialVocabularyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [availableCardsPage, setAvailableCardsPage] = useState(1)
  const [childCardsPage, setChildCardsPage] = useState(1)
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([])
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [mediaCategory, setMediaCategory] = useState<string>('all')

  useEffect(() => {
    publicMediaService.listMedia().then(setMediaAssets).catch(() => { })
  }, [])

  const childVocabIdsForPage = new Set(childVocabulary.map((v: VocabularyItem) => v.id))
  const availableCardsCount = vocabulary.filter((v: VocabularyItem) => !childVocabIdsForPage.has(v.id)).length

  useEffect(() => {
    setAvailableCardsPage(1)
  }, [availableCardsCount])

  useEffect(() => {
    setChildCardsPage((p) => {
      const maxPage = Math.max(1, Math.ceil(childVocabulary.length / 16))
      return p > maxPage ? maxPage : p
    })
  }, [childVocabulary.length])

  useEffect(() => {
    if (editingItem) {
      const isImageUrl = editingItem.image.startsWith('data:') || editingItem.image.startsWith('http')
      setFormData({
        image: editingItem.image,
        imageFile: null,
        imagePreview: isImageUrl ? editingItem.image : '',
        textEn: editingItem.text.en,
        textAr: editingItem.text.ar || '',
        category: editingItem.category,
        level: editingItem.level,
        enabled: editingItem.enabled,
        color: editingItem.color || 'from-blue-400 to-blue-600',
        locations: editingItem.locations || []
      })
    } else {
      setFormData(initialVocabularyForm())
    }
    setFormErrors({})
  }, [editingItem])

  const resetVocabularyForm = () => {
    setFormData(initialVocabularyForm())
    setFormErrors({})
    setShowMediaPicker(false)
    setMediaCategory('all')
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFormErrors({ ...formErrors, image: 'Please select an image file' })
        return
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFormErrors({ ...formErrors, image: 'Image size must be less than 5MB' })
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setFormData({
          ...formData,
          imageFile: file,
          imagePreview: base64String,
          image: base64String
        })
        setFormErrors({ ...formErrors, image: '' })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = () => {
    const errors: Record<string, string> = {}

    // Validate required fields
    if (!formData.image && !formData.imagePreview) {
      errors.image = 'Please upload an image or enter an emoji/URL'
    }
    if (!formData.textEn.trim()) {
      errors.textEn = 'English name is required'
    }
    if (!formData.textAr.trim()) {
      errors.textAr = 'Arabic name is required'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const item = {
      image: formData.image,
      text: {
        en: formData.textEn.trim(),
        ar: formData.textAr.trim()
      },
      category: formData.category,
      level: formData.level,
      enabled: formData.enabled,
      color: formData.color,
      locations: formData.locations,
      order: vocabulary.length + 1
    }

    if (editingItem) {
      onUpdate(editingItem.id, item)
    } else {
      onAdd(item)
    }
    resetVocabularyForm()
    setShowAddModal(false)
    setEditingItem(null)
    setFormErrors({})
  }

  const childVocabIds = new Set(childVocabulary.map((v: VocabularyItem) => v.id))
  const availableCards = vocabulary.filter((v: VocabularyItem) => !childVocabIds.has(v.id))

  const defaultCards = vocabulary.filter((v: any) => v.userId === null)
  const customCards = vocabulary.filter((v: any) => v.userId !== null)

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50">{t(tr.aac.childCards, language)}</h2>
          <p className="text-ink-600 dark:text-ink-300 mt-1">
            {t(tr.aac.childCardsDesc, language)}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingItem(null)
            setShowAddModal(true)
          }}
          variant="primary"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t(tr.aac.createCard, language)}
        </Button>
      </div>


      {/* Custom Cards Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-ink-900 dark:text-ink-50 mb-1 flex items-center gap-2">
          <span>✏️</span> Custom Cards
          <span className="text-sm font-normal text-ink-500 dark:text-ink-400">({customCards.length})</span>
        </h3>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">Cards you created for your child's board.</p>
        {customCards.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-ink-500 dark:text-ink-400 text-sm mb-2">No custom cards yet.</p>
            <p className="text-xs text-ink-400 dark:text-ink-500">Click "Create New Card" to add your own vocabulary cards.</p>
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {customCards.slice((availableCardsPage - 1) * 16, availableCardsPage * 16).map((item: VocabularyItem) => (
                <VocabCard
                  key={item.id}
                  item={item}
                  isAssigned={childVocabIds.has(item.id)}
                  onEdit={() => setEditingItem(item)}
                  onRemoveFromChild={() => setConfirmAction({ id: item.id, type: 'remove-child', name: item.text.en })}
                  onAddToChild={() => onAddCardToChild(item.id)}
                  onDeleteFromLibrary={() => setConfirmAction({ id: item.id, type: 'delete-library', name: item.text.en })}
                  isDefault={false}
                />
              ))}
            </div>
            {customCards.length > 16 && (() => {
              const totalPages = Math.ceil(customCards.length / 16)
              return (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    Showing {(availableCardsPage - 1) * 16 + 1}–{Math.min(availableCardsPage * 16, customCards.length)} of {customCards.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setAvailableCardsPage(p => Math.max(1, p - 1))} disabled={availableCardsPage === 1} className="h-8 px-3 rounded-lg text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button key={page} onClick={() => setAvailableCardsPage(page)} className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${page === availableCardsPage ? 'bg-primary-600 text-white' : 'text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700'}`}>{page}</button>
                    ))}
                    <button onClick={() => setAvailableCardsPage(p => Math.min(totalPages, p + 1))} disabled={availableCardsPage === totalPages} className="h-8 px-3 rounded-lg text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>







      {/* Default Cards Section */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-ink-900 dark:text-ink-50 mb-1 flex items-center gap-2">
          <span>🌐</span> Default Cards
          <span className="text-sm font-normal text-ink-500 dark:text-ink-400">({defaultCards.length})</span>
        </h3>
        <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">Built-in vocabulary cards available to all children.</p>
        {defaultCards.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-ink-500 dark:text-ink-400 text-sm">No default cards found.</p>
          </Card>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {defaultCards.slice((childCardsPage - 1) * 16, childCardsPage * 16).map((item: VocabularyItem) => (
                <VocabCard
                  key={item.id}
                  item={item}
                  isAssigned={childVocabIds.has(item.id)}
                  onEdit={() => setEditingItem(item)}
                  onRemoveFromChild={() => setConfirmAction({ id: item.id, type: 'remove-child', name: item.text.en })}
                  onAddToChild={() => onAddCardToChild(item.id)}
                  onDeleteFromLibrary={() => setConfirmAction({ id: item.id, type: 'delete-library', name: item.text.en })}
                  isDefault={true}
                />
              ))}
            </div>
            {defaultCards.length > 16 && (() => {
              const totalPages = Math.ceil(defaultCards.length / 16)
              return (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-sm text-ink-500 dark:text-ink-400">
                    Showing {(childCardsPage - 1) * 16 + 1}–{Math.min(childCardsPage * 16, defaultCards.length)} of {defaultCards.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setChildCardsPage(p => Math.max(1, p - 1))} disabled={childCardsPage === 1} className="h-8 px-3 rounded-lg text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Previous</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button key={page} onClick={() => setChildCardsPage(page)} className={`h-8 w-8 rounded-lg text-sm font-medium transition-colors ${page === childCardsPage ? 'bg-primary-600 text-white' : 'text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700'}`}>{page}</button>
                    ))}
                    <button onClick={() => setChildCardsPage(p => Math.min(totalPages, p + 1))} disabled={childCardsPage === totalPages} className="h-8 px-3 rounded-lg text-sm font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>



      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || editingItem !== null}
        onClose={() => {
          resetVocabularyForm()
          setShowAddModal(false)
          setEditingItem(null)
        }}
        title={editingItem ? 'Edit Vocabulary Item' : 'Add Vocabulary Item'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Image * (Upload image or enter emoji/URL)
            </label>
            <div className="space-y-3">
              {/* Image Upload */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="block w-full text-sm text-ink-500 dark:text-ink-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100
                    file:cursor-pointer"
                />
                {formErrors.image && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.image}</p>
                )}
              </div>

              {/* Image Preview */}
              {formData.imagePreview && (
                <div className="mt-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-sm text-ink-600 dark:text-ink-300">Preview:</p>
                    <button
                      type="button"
                      className="text-xs font-semibold text-accent-600 hover:underline"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          image: '',
                          imageFile: null,
                          imagePreview: '',
                        })
                        setFormErrors({ ...formErrors, image: '' })
                      }}
                    >
                      Remove image
                    </button>
                  </div>
                  <div className="w-32 h-32 border-2 border-ink-300 dark:border-ink-600 rounded-lg overflow-hidden bg-ink-50 dark:bg-ink-800 flex items-center justify-center">
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Or use emoji/URL */}
              <div className="relative">
                <p className="text-sm text-ink-600 dark:text-ink-300 mb-2">Or enter emoji/URL:</p>
                <Input
                  value={formData.image}
                  onChange={(e) => {
                    setFormData({ ...formData, image: e.target.value, imageFile: null, imagePreview: '' })
                    setFormErrors({ ...formErrors, image: '' })
                  }}
                  placeholder="💧 or https://..."
                />
              </div>

              {/* Media library picker */}
              {mediaAssets.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker((v) => !v)}
                    className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    {showMediaPicker ? 'Hide media library' : 'Choose from media library'}
                  </button>
                  {showMediaPicker && (
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setMediaCategory('all')}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${mediaCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-ink-100 dark:bg-ink-700 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-600'}`}
                        >
                          All
                        </button>
                        {MEDIA_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setMediaCategory(cat)}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${mediaCategory === cat ? 'bg-primary-600 text-white' : 'bg-ink-100 dark:bg-ink-700 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-600'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto rounded-xl border border-ink-200 dark:border-ink-700 p-2">
                        {mediaAssets
                          .filter((a) => a.active && (mediaCategory === 'all' || a.category === mediaCategory))
                          .map((asset) => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, image: asset.url, imagePreview: asset.url, imageFile: null })
                                setShowMediaPicker(false)
                                setFormErrors({ ...formErrors, image: '' })
                              }}
                              className={`aspect-square overflow-hidden rounded-lg border-2 transition-all hover:border-primary-400 ${formData.image === asset.url ? 'border-primary-600' : 'border-transparent'}`}
                              title={asset.originalName}
                            >
                              <img src={asset.url} alt={asset.originalName} className="h-full w-full object-cover" />
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">English Name *</label>
            <Input
              value={formData.textEn}
              onChange={(e) => {
                setFormData({ ...formData, textEn: e.target.value })
                setFormErrors({ ...formErrors, textEn: '' })
              }}
              placeholder="water"
              error={formErrors.textEn}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Arabic Name *</label>
            <Input
              value={formData.textAr}
              onChange={(e) => {
                setFormData({ ...formData, textAr: e.target.value })
                setFormErrors({ ...formErrors, textAr: '' })
              }}
              placeholder="ماء"
              error={formErrors.textAr}
              dir="rtl"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as VocabularyCategory })}
                className="w-full px-3 py-2 border-2 border-ink-300 dark:border-ink-600 rounded-lg dark:bg-ink-800 dark:text-ink-100"
              >
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Level</label>
              <select
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value as VocabularyLevel })}
                className="w-full px-3 py-2 border-2 border-ink-300 dark:border-ink-600 rounded-lg dark:bg-ink-800 dark:text-ink-100"
              >
                {Object.entries(levelLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Color Gradient</label>
            <Input
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              placeholder="from-blue-400 to-blue-600"
            />
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <label className="text-sm">Enabled</label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Show in Locations
              <span className="ml-1.5 text-xs font-normal text-ink-500 dark:text-ink-400">(leave all unchecked to show everywhere)</span>
            </label>
            {locations && locations.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {locations.map((loc: Location) => (
                  <label key={loc.id} className="flex items-center gap-2 cursor-pointer rounded-lg border border-ink-200 dark:border-ink-600 px-3 py-2 hover:bg-ink-50 dark:hover:bg-ink-800">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-primary-600"
                      checked={formData.locations.includes(loc.id)}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...formData.locations, loc.id]
                          : formData.locations.filter((id) => id !== loc.id)
                        setFormData({ ...formData, locations: updated })
                      }}
                    />
                    <span className="text-lg leading-none">{loc.icon}</span>
                    <span className="text-sm font-medium">{loc.name}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500 dark:text-ink-400">No locations set up yet. Go to the Locations tab to add them.</p>
            )}
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddModal(false)
                setEditingItem(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              {editingItem ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete / Remove Confirmation Modal */}
      <Modal
        isOpen={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'delete-library' ? 'Delete Card' : 'Remove Card'}
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-ink-700 dark:text-ink-200">
            {confirmAction?.type === 'delete-library' ? (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-semibold text-ink-900 dark:text-ink-50">
                  {confirmAction.name}
                </span>{' '}
                from the library? This will remove it from all children and cannot be undone.
              </>
            ) : (
              <>
                Remove{' '}
                <span className="font-semibold text-ink-900 dark:text-ink-50">
                  {confirmAction?.name}
                </span>{' '}
                from your child's vocabulary? You can add it back any time.
              </>
            )}
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="flex-1 !bg-red-600 hover:!bg-red-700 !border-red-600 text-white"
              onClick={() => {
                if (!confirmAction) return
                if (confirmAction.type === 'delete-library') {
                  onDelete(confirmAction.id)
                } else {
                  onRemoveCardFromChild(confirmAction.id)
                }
                setConfirmAction(null)
              }}
            >
              {confirmAction?.type === 'delete-library' ? 'Delete permanently' : 'Remove'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// VocabCard sub-component
function VocabCard({ item, isAssigned, onEdit, onRemoveFromChild, onAddToChild, onDeleteFromLibrary, isDefault }: {
  item: VocabularyItem
  isAssigned: boolean
  onEdit: () => void
  onRemoveFromChild: () => void
  onAddToChild: () => void
  onDeleteFromLibrary: () => void
  isDefault: boolean
}) {
  return (
    <Card className={`p-4 transition-opacity ${isAssigned ? 'border-2 border-primary-200 dark:border-primary-800' : 'opacity-80 hover:opacity-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="w-16 h-16 rounded-xl bg-white/80 dark:bg-ink-700 flex items-center justify-center text-4xl overflow-hidden border border-ink-100 dark:border-ink-600">
          {item.image.startsWith('data:') || item.image.startsWith('http') ? (
            <img src={item.image} alt={item.text.en} className="w-full h-full object-cover" />
          ) : (
            <span>{item.image}</span>
          )}
        </div>
        <div className="flex space-x-1">
          {!isDefault && (
            <button onClick={onEdit} className="p-2 hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg" title="Edit card">
              <Edit className="w-4 h-4" />
            </button>
          )}
          {isAssigned ? (
            <button onClick={onRemoveFromChild} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500" title="Remove from child">
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={onAddToChild} className="p-2 hover:bg-green-100 rounded-lg text-green-600" title="Add to child">
              <Plus className="w-4 h-4" />
            </button>
          )}
          {!isDefault && (
            <button onClick={onDeleteFromLibrary} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-400" title="Delete from library">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mb-1">
        <h3 className="font-bold text-lg leading-tight">{item.text.en}</h3>
        {isAssigned && (
          <span className="inline-block px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded text-[10px] font-bold uppercase tracking-wide">Active</span>
        )}
      </div>
      <p className="text-sm text-ink-600 dark:text-ink-300 mb-2" dir="rtl">{item.text.ar}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs font-medium">{categoryLabels[item.category]}</span>
        <span className="px-2 py-0.5 bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300 rounded text-xs font-medium">{levelLabels[item.level]}</span>
      </div>
    </Card>
  )
}

// Settings Panel Component
function SettingsPanel({ settings, onUpdate, onSave }: any) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Board Settings</h2>
          <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
            Tune language, voice, and display options for your child's board.
          </p>
        </div>
        <Button onClick={onSave} variant="primary" leftIcon={<Save className="w-4 h-4" />}>
          Save changes
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Language */}
        <Card className="p-5 space-y-4">
          <SettingsSectionHeader
            icon={<Languages className="h-4 w-4" />}
            title="Language"
            subtitle="Communication language for the board"
            bg="bg-primary-100 dark:bg-primary-900/30"
            color="text-primary-600 dark:text-primary-400"
          />
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-1.5">Primary Language</span>
            <select
              value={settings.primaryLanguage}
              onChange={(e) => onUpdate({ ...settings, primaryLanguage: e.target.value as Language })}
              className="field-input"
            >
              <option value="en">English</option>
              <option value="ar">Arabic</option>
              <option value="en-ar">English + Arabic</option>
            </select>
          </label>
        </Card>

        {/* Voice */}
        <Card className="p-5 space-y-4">
          <SettingsSectionHeader
            icon={<Volume2 className="h-4 w-4" />}
            title="Voice"
            subtitle="How the board speaks to your child"
            bg="bg-accent-100 dark:bg-accent-900/30"
            color="text-accent-600 dark:text-accent-400"
          />
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-1.5">Voice type</span>
            <select
              value={settings.voiceType}
              onChange={(e) => onUpdate({ ...settings, voiceType: e.target.value })}
              className="field-input"
            >
              <option value="child">Child-friendly</option>
              <option value="adult">Adult</option>
              <option value="neutral">Neutral</option>
            </select>
          </label>
          <SliderField
            label="Speech speed"
            value={settings.speechSpeed}
            min={0.5}
            max={2.0}
            step={0.1}
            display={`${settings.speechSpeed.toFixed(1)}×`}
            onChange={(v) => onUpdate({ ...settings, speechSpeed: v })}
          />
          <SliderField
            label="Volume"
            value={settings.volume}
            min={0}
            max={1}
            step={0.1}
            display={`${Math.round(settings.volume * 100)}%`}
            onChange={(v) => onUpdate({ ...settings, volume: v })}
          />
        </Card>

        {/* Vocabulary */}
        <Card className="p-5 space-y-4">
          <SettingsSectionHeader
            icon={<Users className="h-4 w-4" />}
            title="Vocabulary"
            subtitle="Control level and sentence complexity"
            bg="bg-sunny-100 dark:bg-sunny-900/30"
            color="text-sunny-700 dark:text-sunny-400"
          />
          <label className="block">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-1.5">Level</span>
            <select
              value={settings.vocabularyLevel}
              onChange={(e) => onUpdate({ ...settings, vocabularyLevel: e.target.value })}
              className="field-input"
            >
              <option value="basic">Basic — single words</option>
              <option value="intermediate">Intermediate — short phrases</option>
              <option value="advanced">Advanced — full sentences</option>
            </select>
          </label>
          <SliderField
            label="Max sentence length"
            value={settings.maxSentenceLength}
            min={3}
            max={20}
            step={1}
            display={`${settings.maxSentenceLength} words`}
            onChange={(v) => onUpdate({ ...settings, maxSentenceLength: v })}
          />
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">Visible card count</span>
              <span className="text-xs text-ink-400 dark:text-ink-500">0 = unlimited</span>
            </div>
            <input
              type="number"
              min={0}
              value={settings.visibleImageCount || 0}
              onChange={(e) => onUpdate({ ...settings, visibleImageCount: parseInt(e.target.value) || 0 })}
              className="field-input"
              placeholder="0 = unlimited"
            />
          </label>
        </Card>

        {/* Display */}
        <Card className="p-5 space-y-5">
          <SettingsSectionHeader
            icon={<ImageIcon className="h-4 w-4" />}
            title="Display"
            subtitle="Grid layout and card picture size"
            bg="bg-emerald-100 dark:bg-emerald-900/30"
            color="text-emerald-600 dark:text-emerald-400"
          />

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-2">Grid columns</p>
            <div className="grid grid-cols-4 gap-2">
              {([
                { value: 3, label: 'Large', sub: '3/row' },
                { value: 4, label: 'Medium', sub: '4/row' },
                { value: 5, label: 'Small', sub: '5/row' },
                { value: 6, label: 'Tiny', sub: '6/row' },
              ] as const).map((opt) => {
                const active = (settings.gridColumns ?? 4) === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdate({ ...settings, gridColumns: opt.value })}
                    className={[
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-center transition-all',
                      active
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-ink-200 dark:border-ink-700 hover:border-ink-300 dark:hover:border-ink-500',
                    ].join(' ')}
                  >
                    <div className={`grid gap-0.5 w-full`} style={{ gridTemplateColumns: `repeat(${Math.min(opt.value, 4)}, 1fr)` }}>
                      {Array.from({ length: Math.min(opt.value, 4) * 2 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 rounded-sm ${active ? 'bg-emerald-400' : 'bg-ink-300 dark:bg-ink-500'}`}
                        />
                      ))}
                    </div>
                    <div className={`text-xs font-bold leading-none ${active ? 'text-emerald-700 dark:text-emerald-400' : 'text-ink-700 dark:text-ink-300'}`}>
                      {opt.label}
                    </div>
                    <div className="text-[10px] leading-none text-ink-500 dark:text-ink-400">{opt.sub}</div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400 mb-2">Picture size</p>
            <div className="grid grid-cols-3 gap-2">
              {([
                { value: 'small', label: 'Small', sizeClass: 'text-xl' },
                { value: 'medium', label: 'Medium', sizeClass: 'text-2xl' },
                { value: 'large', label: 'Large', sizeClass: 'text-4xl' },
              ] as const).map((opt) => {
                const active = (settings.cardSize ?? 'medium') === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onUpdate({ ...settings, cardSize: opt.value })}
                    className={[
                      'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-center transition-all',
                      active
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-ink-200 dark:border-ink-700 hover:border-ink-300 dark:hover:border-ink-500',
                    ].join(' ')}
                  >
                    <span className={opt.sizeClass} aria-hidden>🖼️</span>
                    <div className={`text-xs font-bold leading-none ${active ? 'text-primary-700 dark:text-primary-400' : 'text-ink-700 dark:text-ink-300'}`}>
                      {opt.label}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function SettingsSectionHeader({
  icon, title, subtitle, bg, color,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  bg: string
  color: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-bold text-ink-900 dark:text-ink-50 leading-none">{title}</h3>
        <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>
      </div>
    </div>
  )
}

function SliderField({
  label, value, min, max, step, display, onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</span>
        <span className="rounded-lg bg-ink-100 dark:bg-ink-700 px-2 py-0.5 text-sm font-bold tabular-nums text-ink-900 dark:text-ink-50">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 cursor-pointer accent-primary-600"
      />
      <div className="flex justify-between mt-0.5 text-[10px] text-ink-400 dark:text-ink-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// Location Management Component
function LocationManagement({
  locations,
  onAdd,
  onEdit,
  onDelete,
  onSave,
  showModal,
  onCloseModal,
  editingLocation,
  deletingLocation,
  setDeletingLocation,
  handleDeleteLocation,
  showToast
}: any) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'home' as LocationType,
    icon: '🏠',
    color: 'from-blue-400 to-blue-600',
    categories: [
      { category: 'needs' as VocabularyCategory, enabled: true },
      { category: 'actions' as VocabularyCategory, enabled: true },
      { category: 'feelings' as VocabularyCategory, enabled: true },
      { category: 'people' as VocabularyCategory, enabled: true },
      { category: 'places' as VocabularyCategory, enabled: false },
      { category: 'social' as VocabularyCategory, enabled: false },
      { category: 'activities' as VocabularyCategory, enabled: false }
    ],
    enabled: true
  })

  useEffect(() => {
    if (editingLocation) {
      setFormData({
        name: editingLocation.name,
        type: editingLocation.type,
        icon: editingLocation.icon,
        color: editingLocation.color,
        categories: editingLocation.categories,
        enabled: editingLocation.enabled
      })
    } else {
      setFormData({
        name: '',
        type: 'home',
        icon: '🏠',
        color: 'from-blue-400 to-blue-600',
        categories: [
          { category: 'needs' as VocabularyCategory, enabled: true },
          { category: 'actions' as VocabularyCategory, enabled: true },
          { category: 'feelings' as VocabularyCategory, enabled: true },
          { category: 'people' as VocabularyCategory, enabled: true },
          { category: 'places' as VocabularyCategory, enabled: false },
          { category: 'social' as VocabularyCategory, enabled: false },
          { category: 'activities' as VocabularyCategory, enabled: false }
        ],
        enabled: true
      })
    }
  }, [editingLocation])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.icon) {
      showToast('Please fill in all required fields', 'warning', 'Validation Error')
      return
    }

    const location: Location = {
      id: editingLocation?.id || `location-${Date.now()}`,
      name: formData.name,
      type: formData.type,
      icon: formData.icon,
      color: formData.color,
      categories: formData.categories,
      enabled: formData.enabled,
      order: editingLocation?.order || locations.length + 1,
      createdAt: editingLocation?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    onSave(location)
  }

  const toggleCategory = (category: VocabularyCategory) => {
    setFormData({
      ...formData,
      categories: formData.categories.map(c =>
        c.category === category ? { ...c, enabled: !c.enabled } : c
      )
    })
  }

  const locationIcons = ['🏠', '🏫', '🛒', '🍽️', '🏥', '🏞️', '🚗', '✈️', '🏖️', '🎪']
  const locationTypes: { value: LocationType; label: string; icon: string }[] = [
    { value: 'home', label: 'Home', icon: '🏠' },
    { value: 'school', label: 'School', icon: '🏫' },
    { value: 'store', label: 'Store', icon: '🛒' },
    { value: 'restaurant', label: 'Restaurant', icon: '🍽️' },
    { value: 'hospital', label: 'Hospital', icon: '🏥' },
    { value: 'park', label: 'Park', icon: '🏞️' },
    { value: 'custom', label: 'Custom', icon: '📍' }
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Location Management</h2>
          <p className="text-ink-600 dark:text-ink-300 mt-1">
            Manage locations where your child can use the communication board. Each location can have different categories enabled.
          </p>
        </div>
        <Button onClick={onAdd} variant="primary">
          <Plus className="w-5 h-5 mr-2" />
          Add Location
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location: Location) => (
          <Card key={location.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`text-5xl bg-gradient-to-br ${location.color} rounded-xl p-3`}>
                  {location.icon}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-ink-900 dark:text-ink-50">{location.name}</h3>
                  <p className="text-sm text-ink-500 dark:text-ink-400 capitalize">{location.type}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(location)}
                  className="p-2 hover:bg-ink-100 dark:hover:bg-ink-700 rounded-lg"
                >
                  <Edit className="w-4 h-4 text-ink-600 dark:text-ink-300" />
                </button>
                <button
                  onClick={() => onDelete(location.id)}
                  className="p-2 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-ink-700 dark:text-ink-200">Enabled Categories:</p>
              <div className="flex flex-wrap gap-2">
                {location.categories
                  .filter(c => c.enabled)
                  .map(c => (
                    <span
                      key={c.category}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs font-medium"
                    >
                      {categoryLabels[c.category]}
                    </span>
                  ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-ink-200 dark:border-ink-700">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={location.enabled}
                  onChange={() => {
                    onSave({ ...location, enabled: !location.enabled })
                  }}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-ink-700 dark:text-ink-200">Enabled</span>
              </label>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Location Modal */}
      <Modal
        isOpen={showModal}
        onClose={onCloseModal}
        title={editingLocation ? 'Edit Location' : 'Add New Location'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Location Name"
            placeholder="e.g., Home, School, Store"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-2">
              Location Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {locationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: type.value, icon: type.icon })}
                  className={`
                    p-3 rounded-lg border-2 transition-all text-center
                    ${formData.type === type.value
                      ? 'border-primary-500 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-ink-200 dark:border-ink-700 hover:border-ink-300 dark:hover:border-ink-500'
                    }
                  `}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-xs font-medium">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-2">
              Icon (Emoji)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {locationIcons.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon })}
                  className={`
                    text-2xl p-2 rounded-lg border-2 transition-all
                    ${formData.icon === icon
                      ? 'border-primary-500 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-ink-200 dark:border-ink-700 hover:border-ink-300 dark:hover:border-ink-500'
                    }
                  `}
                >
                  {icon}
                </button>
              ))}
            </div>
            <Input
              placeholder="Or type custom emoji"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-2">
              Color Theme
            </label>
            <select
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-2 border-2 border-ink-300 dark:border-ink-600 rounded-lg dark:bg-ink-800 dark:text-ink-100"
            >
              <option value="from-blue-400 to-blue-600">Blue</option>
              <option value="from-green-400 to-green-600">Green</option>
              <option value="from-purple-400 to-purple-600">Purple</option>
              <option value="from-orange-400 to-orange-600">Orange</option>
              <option value="from-red-400 to-red-600">Red</option>
              <option value="from-yellow-400 to-yellow-600">Yellow</option>
              <option value="from-pink-400 to-pink-600">Pink</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-3">
              Available Categories
            </label>
            <div className="space-y-2">
              {formData.categories.map((cat) => (
                <label
                  key={cat.category}
                  className="flex items-center space-x-3 p-3 border-2 border-ink-200 dark:border-ink-700 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-700/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={cat.enabled}
                    onChange={() => toggleCategory(cat.category)}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="font-medium text-ink-900 dark:text-ink-50">
                    {categoryLabels[cat.category]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-4 h-4 text-primary-600"
            />
            <label htmlFor="enabled" className="text-sm font-medium text-ink-700 dark:text-ink-200">
              Enable this location
            </label>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={onCloseModal}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              <Save className="w-4 h-4 mr-2" />
              Save Location
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingLocation !== null}
        onClose={() => setDeletingLocation(null)}
        title="Delete Location"
      >
        <div className="space-y-4">
          <p className="text-ink-700 dark:text-ink-200">
            Are you sure you want to delete this location? This action cannot be undone.
          </p>
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={() => setDeletingLocation(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
              onClick={() => {
                if (deletingLocation) {
                  handleDeleteLocation(deletingLocation)
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// Analytics Panel Component
function AnalyticsPanel({ analytics }: any) {
  const totalSentences = analytics.totalSentences ?? 0
  const averageSentenceLength: number = analytics.averageSentenceLength ?? 0
  const sentenceFrequency = analytics.sentenceFrequency ?? 0
  const mostUsed = (analytics.mostUsedImages ?? []).slice(0, 10)
  const usageTimePatterns: any[] = analytics.usageTimePatterns ?? []

  return (
    <div>
      <h2 className="text-2xl font-bold text-ink-900 dark:text-ink-50 mb-6">Usage Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card variant="primary" padding="md" className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {totalSentences}
          </div>
          <div className="text-white/80 text-sm font-medium">Total Sentences</div>
        </Card>
        <Card variant="primary" padding="md" className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {averageSentenceLength.toFixed(1)}
          </div>
          <div className="text-white/80 text-sm font-medium">Avg. Sentence Length</div>
        </Card>
        <Card variant="primary" padding="md" className="text-center">
          <div className="text-3xl font-bold text-white mb-2">
            {sentenceFrequency}
          </div>
          <div className="text-white/80 text-sm font-medium">Sentences Today</div>
        </Card>
      </div>

      <Card className="p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Most Used Images</h3>
        <div className="space-y-3">
          {mostUsed.length === 0 ? (
            <p className="text-ink-600 dark:text-ink-300">No usage data yet</p>
          ) : (
            mostUsed.map((item: any, index: number) => (
              <div key={item.vocabularyId} className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-2xl">
                  {item.vocabulary.image}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{item.vocabulary.text.en}</div>
                  <div className="text-sm text-ink-600 dark:text-ink-300">Used {item.count} times</div>
                </div>
                <div className="w-32 bg-ink-200 dark:bg-ink-700 rounded-full h-4">
                  <div
                    className="bg-primary-600 h-4 rounded-full"
                    style={{ width: `${(item.count / mostUsed[0].count) * 100}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Usage by Hour</h3>
        <div className="grid grid-cols-12 gap-2">
          {usageTimePatterns.map((pattern: any, index: number) => (
            <div key={index} className="text-center">
              <div className="text-xs text-ink-600 dark:text-ink-300 mb-1">{pattern.hour}:00</div>
              <div className="bg-ink-200 dark:bg-ink-700 rounded h-24 flex items-end">
                <div
                  className="bg-primary-600 w-full rounded transition-all"
                  style={{ height: `${(pattern.count / Math.max(...usageTimePatterns.map((p: any) => p.count), 1)) * 100}%` }}
                />
              </div>
              <div className="text-xs font-medium mt-1">{pattern.count}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
