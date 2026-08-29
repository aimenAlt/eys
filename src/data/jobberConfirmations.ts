/**
 * Post-Jobber confirmation destinations.
 *
 * Jobber redirects here after successful form submission. Conversion events
 * (Meta Schedule/Lead + GA4 booking_complete/lead_submit) fire only on these pages.
 *
 * To add another Jobber form later: append one entry and configure its Jobber
 * redirect URL. Routes are generated from this list.
 */

export type JobberConfirmationType = 'booking' | 'request';
export type JobberMetaEvent = 'Schedule' | 'Lead';
export type JobberAnalyticsEvent = 'booking_complete' | 'lead_submit';

export interface JobberConfirmation {
  slug: string;
  type: JobberConfirmationType;
  metaEvent: JobberMetaEvent;
  analyticsEvent: JobberAnalyticsEvent;
  contentName: string;
  contentCategory: string;
  service: string;
  heading: string;
  message: string;
  seoTitle: string;
  seoDescription: string;
}

export const jobberConfirmations: readonly JobberConfirmation[] = [
  {
    slug: 'on-site-estimate',
    type: 'booking',
    metaEvent: 'Schedule',
    analyticsEvent: 'booking_complete',
    contentName: 'Free 30-Minute On-Site Estimate',
    contentCategory: 'On-Site Estimate',
    service: 'on_site_estimate',
    heading: 'Your On-Site Estimate Is Scheduled',
    message:
      "Your complimentary 30-minute on-site estimate has been scheduled with Elevate Your Space Handyman. We'll review the project details during your visit and follow up if anything else is needed beforehand.",
    seoTitle: 'On-Site Estimate Scheduled',
    seoDescription: 'Your complimentary 30-minute on-site estimate has been scheduled with Elevate Your Space Handyman.',
  },
  {
    slug: 'handyman-to-do-list',
    type: 'booking',
    metaEvent: 'Schedule',
    analyticsEvent: 'booking_complete',
    contentName: 'Handyman To-Do List Visit',
    contentCategory: 'Handyman Services',
    service: 'handyman_to_do_list',
    heading: 'Your Handyman Visit Is Scheduled',
    message:
      "Your handyman visit has been scheduled. We'll review the project information you provided and arrive prepared to work through your prioritized list.",
    seoTitle: 'Handyman Visit Scheduled',
    seoDescription: 'Your handyman to-do list visit has been scheduled with Elevate Your Space Handyman.',
  },
  {
    slug: 'high-ceiling-curtains',
    type: 'booking',
    metaEvent: 'Schedule',
    analyticsEvent: 'booking_complete',
    contentName: 'High-Ceiling Curtain Installation',
    contentCategory: 'Curtain Installation',
    service: 'high_ceiling_curtains',
    heading: 'Your High-Ceiling Curtain Installation Is Scheduled',
    message:
      "Your high-ceiling curtain installation has been scheduled. We'll review the details you provided and follow up if we need anything else before your appointment.",
    seoTitle: 'High-Ceiling Curtain Installation Scheduled',
    seoDescription: 'Your high-ceiling curtain installation has been scheduled with Elevate Your Space Handyman.',
  },
  {
    slug: 'standard-height-curtains',
    type: 'booking',
    metaEvent: 'Schedule',
    analyticsEvent: 'booking_complete',
    contentName: 'Standard-Height Curtain Installation',
    contentCategory: 'Curtain Installation',
    service: 'standard_height_curtains',
    heading: 'Your Curtain Installation Is Scheduled',
    message:
      "Your standard-height curtain installation has been scheduled. We'll review the details you provided and follow up if anything else is needed before your appointment.",
    seoTitle: 'Curtain Installation Scheduled',
    seoDescription: 'Your standard-height curtain installation has been scheduled with Elevate Your Space Handyman.',
  },
  {
    slug: 'tv-mounting',
    type: 'booking',
    metaEvent: 'Schedule',
    analyticsEvent: 'booking_complete',
    contentName: 'TV Mounting Installation',
    contentCategory: 'TV Mounting',
    service: 'tv_mounting',
    heading: 'Your TV Mounting Appointment Is Scheduled',
    message:
      "Your TV mounting appointment has been scheduled. We'll review the project details and photos you provided so we can arrive prepared for your installation. We'll follow up if anything else is needed beforehand.",
    seoTitle: 'TV Mounting Appointment Scheduled',
    seoDescription: 'Your TV mounting appointment has been scheduled with Elevate Your Space Handyman.',
  },
  {
    slug: 'media-wall',
    type: 'request',
    metaEvent: 'Lead',
    analyticsEvent: 'lead_submit',
    contentName: 'Media Wall Design Consultation',
    contentCategory: 'Media Wall',
    service: 'media_wall',
    heading: 'Your Media Wall Request Has Been Received',
    message:
      "Thank you for sharing the details of your media wall project. Elevate Your Space Handyman will review your information and reach out regarding the next step. If you'd like to reach us sooner, call (346) 820-1629.",
    seoTitle: 'Media Wall Request Received',
    seoDescription: 'Thank you for sharing your media wall project details with Elevate Your Space Handyman.',
  },
  {
    slug: 'project-estimate',
    type: 'request',
    metaEvent: 'Lead',
    analyticsEvent: 'lead_submit',
    contentName: 'Project Estimate Request',
    contentCategory: 'Project Estimate',
    service: 'project_estimate',
    heading: 'Your Estimate Request Has Been Received',
    message:
      "Thank you for submitting your project details. We'll review the information provided and follow up regarding the next step for your estimate. If you'd like to reach us sooner, call (346) 820-1629.",
    seoTitle: 'Estimate Request Received',
    seoDescription: 'Thank you for submitting your project estimate request to Elevate Your Space Handyman.',
  },
  {
    slug: 'kitchen-remodel',
    type: 'request',
    metaEvent: 'Lead',
    analyticsEvent: 'lead_submit',
    contentName: 'Kitchen Remodel Estimate Request',
    contentCategory: 'Kitchen Remodel',
    service: 'kitchen_remodel',
    heading: 'Your Kitchen Remodel Request Has Been Received',
    message:
      "Thank you for sharing the details of your kitchen remodel. Elevate Your Space Handyman will review your information and reach out regarding the next step. If you'd like to reach us sooner, call (346) 820-1629.",
    seoTitle: 'Kitchen Remodel Request Received',
    seoDescription: 'Thank you for sharing your kitchen remodel project details with Elevate Your Space Handyman.',
  },
  {
    slug: 'bathroom-remodel',
    type: 'request',
    metaEvent: 'Lead',
    analyticsEvent: 'lead_submit',
    contentName: 'Bathroom Remodel Estimate Request',
    contentCategory: 'Bathroom Remodel',
    service: 'bathroom_remodel',
    heading: 'Your Bathroom Remodel Request Has Been Received',
    message:
      "Thank you for sharing the details of your bathroom remodel. Elevate Your Space Handyman will review your information and reach out regarding the next step. If you'd like to reach us sooner, call (346) 820-1629.",
    seoTitle: 'Bathroom Remodel Request Received',
    seoDescription: 'Thank you for sharing your bathroom remodel project details with Elevate Your Space Handyman.',
  },
] as const;

export function confirmationPath(entry: JobberConfirmation): string {
  const prefix = entry.type === 'booking' ? 'booking-confirmed' : 'request-confirmed';
  return `/${prefix}/${entry.slug}/`;
}

export function getBookingConfirmations(): JobberConfirmation[] {
  return jobberConfirmations.filter((entry) => entry.type === 'booking');
}

export function getRequestConfirmations(): JobberConfirmation[] {
  return jobberConfirmations.filter((entry) => entry.type === 'request');
}

export function getConfirmationBySlug(
  type: JobberConfirmationType,
  slug: string,
): JobberConfirmation | undefined {
  return jobberConfirmations.find((entry) => entry.type === type && entry.slug === slug);
}
