# SlideFlow Backlog Ingest Prompt for Codex

**Instruction to Codex:**
Take in the following information and add it to the SlideFlow backlog. Use your own judgment for naming, structuring, categorizing, and file placement. You may overwrite existing entries only when the new information is more detailed, accurate, or relevant; otherwise append new entries. The following is a structured list of new backlog items.

---

## Backlog Items

```json
{
  "backlog_items": [
    {
      "title": "Fix Scroll Position for 'See How Slideflow Works' Button",
      "description": "On the landing page, clicking the button scrolls too far down. Optimize and correct the scroll offset."
    },
    {
      "title": "Revise 'How SlideFlow Works' Text",
      "description": "Current text: 'Slide Flow is the fastest way to create, organize, and publish Instagram carousels. Upload, arrange, caption, and publish without graphic design or image editing.' Improve clarity and accuracy."
    },
    {
      "title": "Update Hero Subtitle Text",
      "description": "Replace 'Upload, Arrange, Generate, Publish' with 'Upload. Arrange. Caption. Publish.'"
    },
    {
      "title": "Reduce White Space in Example Carousel Section",
      "description": "Too much white space around example carousels. Tighten layout substantially."
    },
    {
      "title": "Replace Sample Carousel Images",
      "description": "Swap placeholder/example images with real generated images."
    },
    {
      "title": "Enable Horizontal Drag Scrolling for Carousel Wheel",
      "description": "Allow clicking-and-dragging horizontally to scroll through carousel wheel images."
    },
    {
      "title": "Refine Pricing Chart Wording",
      "description": "Improve clarity, naming, and wording in pricing charts."
    },
    {
      "title": "Make Profile Name and Email Editable",
      "description": "Add ability to edit name and email, then save updates to user ID in Supabase."
    },
    {
      "title": "Add Profile Image Upload",
      "description": "Allow users to upload a profile image from the profile page."
    },
    {
      "title": "Fix Profile Page Left-Side Spacing",
      "description": "Adjust font size/spacing so long names and emails fit cleanly."
    },
    {
      "title": "Enable Payment Method Update",
      "description": "Add working button for users to update payment method (Stripe)."
    },
    {
      "title": "Fix Cancel Plan Logic",
      "description": "Cancel plan button should correctly downgrade users to free plan. Rebuild this logic."
    },
    {
      "title": "Redesign Weekly View on Dashboard",
      "description": "Refine aesthetics and styling. Calendar posting feature not yet implemented; this is groundwork."
    },
    {
      "title": "Add Content Calendar Button",
      "description": "Button navigates to calendar page for drag-and-drop scheduling of carousels for future publishing (not yet implemented)."
    },
    {
      "title": "Add SlideFlow Studio Button to Dashboard",
      "description": "Button leads to Studio for image editing, brand settings, and media creation."
    },
    {
      "title": "Dashboard Button Row Alignment",
      "description": "Align Calendar, Studio, Media Library, Brand Profile, and Create New Carousel buttons in one centered row."
    },
    {
      "title": "Fix Carousel Title Renaming on Dashboard",
      "description": "Double-clicking carousel titles fails. Fix inline renaming and saving."
    },
    {
      "title": "Remove Description Field from Carousel Cards",
      "description": "Description is no longer used. Remove from UI and database usage."
    },
    {
      "title": "Remove Copy and Export Buttons from Carousel Cards",
      "description": "Remove copy/export buttons; adjust UI."
    },
    {
      "title": "Relocate Trash Icon on Carousel Cards",
      "description": "Move the delete icon to a new location on the card while maintaining functionality."
    },
    {
      "title": "Replace Slide Number Label with Instagram-style Dots",
      "description": "Use small white dots representing number of slides; highlight current slide. Similar to existing page-based indicators but styled like Instagram."
    },
    {
      "title": "Lighten Drop Zone and Slide Slots on Slideboard",
      "description": "Make drop zone and slide slot backgrounds lighter."
    },
    {
      "title": "Fix Flickering During Slide Uploads",
      "description": "Upload process feels clunky and flickers. Improve loading behavior and add a progress bar per slide."
    },
    {
      "title": "Rebuild Drag-and-Drop Interaction on Slideboard",
      "description": "Enable picking up a slide that visually detaches from the board; other slides remain still until hovering over a slot. When dropped on an occupied slot, shift slides left or right to nearest open slot. Smooth, natural interactions required."
    },
    {
      "title": "Double-Click to Upload in Slideboard",
      "description": "Double-clicking any empty slot or the main drop zone should open file picker (same behavior as Add Files button)."
    },
    {
      "title": "Hide Helper Text While Slide is Loading",
      "description": "When a slide is uploading, hide the helper text that says 'Hint: Add an image to continue.'"
    },
    {
      "title": "Change Font Size & Color of Helper Text",
      "description": "Adjust styling for helper text in Prompt Generate textbox and Caption textbox."
    },
    {
      "title": "Match Preview Card Dimensions on Publish Page",
      "description": "Publish page preview card should use the same dimensions as the generate-page preview card."
    },
    {
      "title": "Add Retro-Style Publish Button",
      "description": "Top-right corner of publish card should include a retro next-style button labeled 'Publish' with bouncing arrow. Deactivated until blue publish button is pressed (two-step arming)."
    },
    {
      "title": "Review and Adjust Readiness Panel on Publish Card",
      "description": "Evaluate the need and final design of the readiness panel on the publish card."
    },
    {
      "title": "Update Text on Slideflow Studio Card (Publish Page)",
      "description": "Replace text with: 'Editing background removal text overlays, AI-generated images, and advanced exports. Your slides and captions will carry over.'"
    },
    {
      "title": "Remove Step Label on Publish Page",
      "description": "Remove 'Step Four, Publish' label from top right of page."
    }
  ]
}
```