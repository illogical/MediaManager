# Objective

A web application with the primary focus of displaying photos and videos and quickly swiping through them to view/preview them, like or dislike, tag them. The main differentiating feature will be multiple options for robust randomization for viewing the media files. The user should be able to review media content, via thumbnail previews, and return to where they had last left off (which item was last viewed but also the sort order and applied filters to media file queue).

For images only, by default they should be displayed to fit full-page without affecting the image’s original aspect ratio. Users should be able to pinch to zoom otherwise use the mouse scroll wheel to zoom in and out.

Videos should be zoomed to fit full-page without affecting the original aspect ratio

# Features

- [ ]  Configuration JSON schema for selected folder locations that contain images and/or videos to display as options on the website’s navigation bar
- [ ]  Track a view history that tracks the last time the photo or video was viewed and how many times it was viewed
- [ ]  Ability to tag images and videos
    - [ ]  Auto-complete for adding existing tags
- [ ]  Ability to like or dislike media files
- [ ]  Track the number of times the like button was clicked for each photo or video
- [ ]  Ability to filter by folder and by tag
- [ ]  Ability to filter by images or videos and remember the choice for each selected folder
- [ ]  Ability to filter by likes or dislikes
- [ ]  Ability to view a view history list
    - [ ]  Displays the last 20 viewed items
- [ ]  Custom algorithm for randomly choosing an image or video to play
    - [ ]  Ability to store the randomization as a named playlist
    - [ ]  Support for selecting from a list a playlists
- [ ]  Ability to take action only disliked images and videos in bulk
    - [ ]  A filter to view and select disliked content along with a delete button that will accept an array of file paths and will move them to a temporary directory to be reviewed later
- [ ]  Ability to start where the user had left off
    - [ ]  Remember the last viewed folder and image or video
        - [ ]  Need to serialize details such as folder path, media type, sort order, and/or additional filters to be able to apply them again next the page is visited
        - [ ]  Needs to serialize the current randomization order (store in a lookup table of order to media ID)

## Inputs Supported

- **Mouse & Keyboard**
    - Click to select/open, drag to scroll carousel.
    - Scroll wheel: Vertical scroll in grid, Zoom in/out in single view, Horizontal scroll in Carousel.
    - Arrow keys for navigation (Next/Previous).
- **Touch**
    - Tap to select, swipe to scroll.
    - Pinch-to-zoom in single view.
    - Horizontal swipe for Next/Previous in single view.
- **VR (WebXR)**
    - Support for VR controllers (pointers).
    - Trigger/Grip click and drag for scrolling Carousel.
    - Thumbstick/Touchpad horizontal axis for Carousel scrolling.
    - Next/Previous media buttons on controllers.

## Zoom Logic (Single Media View)

The single media view should automatically scale the image to fit the viewport while maintaining aspect ratio:
- **Portrait Orientation Image**: Scales so the top and bottom edges match the window height.
- **Landscape Orientation Image**: Scales so the left and right edges match the window width.
- **Dynamic Resizing**: The image should re-evaluate these constraints if the window is resized.
- **Manual Zoom**: Users can override the default "Fit" scale using scroll wheel or pinch gestures.

## Randomization

The randomization algorithm should prioritize least-viewed images and videos and ignore disliked images and videos. In addition to the sort orders and filters I want to have available, I want to support a few different randomization algorithms.

Media will be viewed based upon a selected folder path, a file type filter (images or videos), and optional applied tags for filtering. The randomization options should be able to be applied to the current media file filters (randomize just the currently-filtered lists of content).

### Support for Starting from Where the User Left Off

This randomization needs to support being serialized so that it can be remembered where the user had left off. We want to track the concept of a placeholder so that the last-viewed media file can be displayed when the web site next loads or a new session is started.

### Randomization Methods

- Choose any random media file ignoring all disliked
- These will all ignore the disliked files
    - Randomize a list of media that has never been viewed before
    - Prioritize the least-played file(s)
        - Creates a randomized list starting with files with the lowest play count
    - Prioritize the most-liked files
        - The like button will be stored as an integer where each time the like button is clicked for an media file, the integer will be incremented.
    - Prioritize the most-played files

## Sort Order

 It should have an option to sort by:

- Most viewed
- Least viewed (including unviewed)
- Most recently viewed
- Least recently viewed
- Most and least recent by creation date
- Most liked

# Available Filters

- Liked or disliked
    - When filtered by dislikes, provide an option to “delete” (or move) all that are marked as disliked
- Unviewed (image or video with zero views)
- Videos, images, or both
- By tag(s)

# Layout

- [ ]  Ability to hide the navigation to focus on content. The interface will be like an overlay where the footer slides in from the top and a left nav that slides in from the left when the user clicks on the content and slides out if the content is clicked again.
    - [ ]  Click or tap to display the navigation and menus
- [ ]  Navigation for selecting a folder path by name, selecting tags for filtering, and selecting filters such as media type. Also a way to select a playlist name instead of a folder.
    - [ ]  A left navigation bar for selecting which folder’s images and/or videos should be displayed and the sort order, and image and or/video filter
- [ ]  A top menu bar that contains the buttons for liking, disliking, tagging, randomizing, display the previous or next image or video.
- [ ]  **Carousel Component**
    - [ ]  Full-width horizontal strip, typically at the bottom or as a dedicated view mode.
    - [ ]  Supports click-and-drag (mouse) or swipe (touch) to scroll.
    - [ ]  Scroll wheel support for horizontal movement.
    - [ ]  VR controller drag-to-scroll support.
- [ ]  Ability to view a grid of image and/or video preview thumbnails for the selected folder and the ability to click on an image or video to select it and display it full-screen
- [ ]  Ability to go back from viewing a photo or video to viewing the grid of previews for the selected folder

# Dependencies

A SQLite database and/or JSON schema for tracking:

- MediaFiles
    - ID
    - Folder path
    - Filename
    - View counts
    - Last viewed
    - Applied tags
    - Likes
    - Dislikes
- Last selected folder path, applied sort order, and applied filters
    - Or the currently-selected playlist
    - Which image/video was last viewed
- View History (track the last 20 items viewed)
    - MediaFileId
    - Viewed (timestamp)
- Available tags
- Tagged images and videos
- Any other user configurations/settings
- Playlists
- PlaylistMediaOrder
    - Each playlist will need a mapping of media file IDs to sort order

## Anticipated Controller Actions

- [ ]  GetMediaByFolder(folderPath, sort, filters)
- [ ]  GetFileByPath(filePath)
- [ ]  GetFileById(fileId)
- [ ]  GetMediaPlayHistory
- [ ]  RandomizeMedia(path, filters)
- [ ]  Like(fileId)
- [ ]  Dislike(fileId)
- [ ]  GetTags
- [ ]  AddTag(tag. fileId)
- [ ]  RemoveTag(tag. fileId)
- [ ]  Viewed(fileId)
- [ ]  DeleteDisliked