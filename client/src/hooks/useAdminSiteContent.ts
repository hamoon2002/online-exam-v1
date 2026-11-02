import { useCallback, useEffect, useState } from 'react';
import {
  getDraftSiteContent,
  publishSiteContent,
  resetSiteContentDraft,
  updateSiteContentSection,
  uploadSiteContentImage,
  type SiteContentMap,
  type SiteContentSection,
} from '../api/cmsApi';
import { ApiError } from '../lib/apiClient';

function useAdminSiteContent() {
  const [sections, setSections] = useState<SiteContentMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [savingSection, setSavingSection] = useState<SiteContentSection | null>(
    null
  );
  const [uploadingSection, setUploadingSection] =
    useState<SiteContentSection | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getDraftSiteContent()
      .then((res) => setSections(res.sections))
      .catch(() => setError('دریافتِ محتوای فرود با خطا مواجه شد'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSection(
    section: SiteContentSection,
    data: Record<string, unknown>
  ): Promise<boolean> {
    setSavingSection(section);
    setError(null);
    setSuccessMessage(null);
    try {
      await updateSiteContentSection(section, data);
      // Confirm draft persistence without touching the public page.
      const latest = await getDraftSiteContent();
      const actual = latest.sections[section];
      const matches = Object.entries(data).every(([key, value]) =>
        JSON.stringify(actual[key]) === JSON.stringify(value)
      );
      setSections(latest.sections);
      if (!matches) {
        setError('ذخیره تأیید نشد؛ اطلاعات خوانده‌شده از سرور با فرم متفاوت است.');
        return false;
      }
      setError(null);
      setSuccessMessage('پیش‌نویس ذخیره شد؛ برای نمایش در سایت، انتشار را بزنید.');
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'ذخیره‌سازی با خطا مواجه شد');
      return false;
    } finally {
      setSavingSection(null);
    }
  }

  async function resetDraft(section: SiteContentSection): Promise<boolean> {
    setSavingSection(section);
    setError(null);
    setSuccessMessage(null);
    try {
      await resetSiteContentDraft(section);
      const latest = await getDraftSiteContent();
      setSections(latest.sections);
      setSuccessMessage('پیش‌نویس این بخش پاک شد؛ صفحه اصلی تغییری نکرد.');
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'پاک کردن پیش‌نویس انجام نشد.');
      return false;
    } finally {
      setSavingSection(null);
    }
  }

  const [publishing, setPublishing] = useState(false);
  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const result = await publishSiteContent();
      setSuccessMessage(result.publishedCount ? 'محتوا با موفقیت در صفحه اصلی منتشر شد.' : 'تغییر تازه‌ای برای انتشار وجود ندارد.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'انتشار انجام نشد؛ دوباره تلاش کنید.');
    } finally {
      setPublishing(false);
    }
  }

  async function uploadImage(
    section: SiteContentSection,
    file: File
  ): Promise<string | null> {
    setUploadingSection(section);
    try {
      const { imageUrl } = await uploadSiteContentImage(section, file);
      return imageUrl;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'آپلودِ تصویر با خطا مواجه شد');
      return null;
    } finally {
      setUploadingSection(null);
    }
  }

  return {
    sections,
    loading,
    error,
    clearError: () => setError(null),
    successMessage,
    clearSuccessMessage: () => setSuccessMessage(null),
    savingSection,
    uploadingSection,
    saveSection,
    resetDraft,
    publishing,
    publish,
    uploadImage,
    refresh: load,
  };
}

export default useAdminSiteContent;
