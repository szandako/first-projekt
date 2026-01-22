import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Initialize Supabase clients
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
};

const getSupabaseAnonClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  );
};

// Storage bucket name
const BUCKET_NAME = 'make-af67b925-instagram-images';

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Initialize storage bucket on startup
(async () => {
  const supabase = getSupabaseClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  
  if (!bucketExists) {
    const { error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    });
    if (error) {
      console.error('Error creating storage bucket:', error);
    } else {
      console.log('Storage bucket created successfully');
    }
  }
})();

// Helper function to verify user authentication
async function verifyUser(authHeader: string | undefined) {
  if (!authHeader) {
    return { user: null, error: 'No authorization header' };
  }
  
  const accessToken = authHeader.split(' ')[1];
  const supabase = getSupabaseAnonClient();
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  
  if (error || !user) {
    return { user: null, error: 'Unauthorized' };
  }
  
  return { user, error: null };
}

// Health check endpoint
app.get("/make-server-af67b925/health", (c) => {
  return c.json({ status: "ok" });
});

// Sign up endpoint
app.post("/make-server-af67b925/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || '' },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });
    
    if (error) {
      console.error('Sign up error:', error);
      return c.json({ error: error.message }, 400);
    }
    
    return c.json({ 
      user: { 
        id: data.user.id, 
        email: data.user.email,
        name: data.user.user_metadata?.name 
      } 
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return c.json({ error: 'Internal server error during sign up' }, 500);
  }
});

// Get user's posts
app.get("/make-server-af67b925/posts", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log('📥 GET /posts - Loading posts for user:', user.id);
    const posts = await kv.getByPrefix(`user:${user.id}:post:`);
    console.log('📥 Retrieved', posts.length, 'posts from KV store');
    
    // Get signed URLs for images
    const supabase = getSupabaseClient();
    const postsWithUrls = await Promise.all(
      posts.map(async (post: any) => {
        console.log('📸 Processing post:', { id: post.id, hasImagePath: !!post.imagePath });
        
        if (post.imagePath) {
          console.log('🔗 Checking if file exists:', post.imagePath);
          
          // First check if the file exists in storage
          const { data: fileData, error: fileError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(post.imagePath.split('/')[0], {
              search: post.imagePath.split('/')[1]
            });
          
          if (fileError || !fileData || fileData.length === 0) {
            console.warn('⚠️ File does not exist in storage:', post.imagePath);
            console.log('🗑️ Cleaning up stale metadata from KV store');
            // File doesn't exist, return post without image
            return { ...post, image: null, imagePath: null };
          }
          
          console.log('✅ File exists, creating signed URL...');
          const { data, error: urlError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(post.imagePath, 3600); // 1 hour expiry
          
          if (urlError) {
            console.error('❌ Error creating signed URL:', urlError);
            return { ...post, image: null };
          }
          
          if (data?.signedUrl) {
            console.log('✅ Signed URL created successfully');
            return { ...post, image: data.signedUrl };
          } else {
            console.warn('⚠️ No signed URL in response data:', data);
            return { ...post, image: null };
          }
        }
        
        console.log('ℹ️ Post has no imagePath, skipping');
        return post;
      })
    );
    
    console.log('✅ Returning', postsWithUrls.length, 'posts with URLs');
    return c.json({ posts: postsWithUrls });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return c.json({ error: 'Internal server error while fetching posts' }, 500);
  }
});

// Save/update a post
app.post("/make-server-af67b925/posts", async (c) => {
  try {
    console.log('📥 POST /posts - Request received');
    
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      console.log('❌ Unauthorized:', error);
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log('✅ User verified:', user.id);
    
    const body = await c.req.json();
    console.log('📦 Request body:', { 
      id: body.id, 
      hasImage: !!body.image, 
      imagePrefix: body.image?.substring(0, 30),
      hasCaption: !!body.caption,
      hasScheduledTime: !!body.scheduledTime,
      hasNotes: !!body.notes
    });
    
    const { id, image, caption, scheduledTime, notes } = body;
    
    if (!id) {
      console.log('❌ No ID provided');
      return c.json({ error: 'Post ID is required' }, 400);
    }
    
    const postKey = `user:${user.id}:post:${id}`;
    let imagePath = null;
    
    // Check if image is an existing path reference
    if (image && image.startsWith('EXISTING_PATH:')) {
      console.log('♻️ Reusing existing image path');
      imagePath = image.replace('EXISTING_PATH:', '');
      console.log('📂 Extracted imagePath:', imagePath);
    }
    // If image is provided and it's a base64 data URL, upload to storage
    else if (image && image.startsWith('data:')) {
      console.log('🖼️ Processing base64 image upload...');
      try {
        const base64Data = image.split(',')[1];
        const mimeType = image.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
        const extension = mimeType.split('/')[1];
        
        console.log('📝 Image details:', { mimeType, extension, base64Length: base64Data?.length });
        
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `${user.id}/${id}-${Date.now()}.${extension}`;
        
        console.log('📤 Uploading to storage:', fileName, 'size:', buffer.length);
        
        const supabase = getSupabaseClient();
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true,
          });
        
        if (uploadError) {
          console.error('❌ Error uploading image:', uploadError);
          return c.json({ error: 'Failed to upload image', details: uploadError.message }, 500);
        }
        
        console.log('✅ Image uploaded successfully');
        imagePath = fileName;
      } catch (uploadError: any) {
        console.error('❌ Error processing image upload:', uploadError);
        return c.json({ error: 'Failed to process image', details: uploadError.message }, 500);
      }
    } else {
      console.log('ℹ️ No new image, checking for existing...');
      // If image is already a URL or path, try to extract the path
      const existingPost = await kv.get(postKey);
      imagePath = existingPost?.imagePath || null;
      console.log('📂 Existing imagePath:', imagePath);
    }
    
    const postData = {
      id,
      caption: caption || null,
      scheduledTime: scheduledTime || null,
      imagePath,
      updatedAt: new Date().toISOString(),
      notes: notes || null
    };
    
    console.log('💾 Saving to KV store:', postKey);
    await kv.set(postKey, postData);
    
    console.log('✅ Post saved successfully');
    return c.json({ success: true, post: postData });
  } catch (error: any) {
    console.error('❌ Error saving post:', error);
    console.error('❌ Error stack:', error.stack);
    return c.json({ error: 'Internal server error while saving post', details: error.message }, 500);
  }
});

// Delete a post
app.delete("/make-server-af67b925/posts/:id", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const id = c.req.param('id');
    const postKey = `user:${user.id}:post:${id}`;
    
    // Get post to delete image from storage
    const post = await kv.get(postKey);
    if (post?.imagePath) {
      const supabase = getSupabaseClient();
      await supabase.storage.from(BUCKET_NAME).remove([post.imagePath]);
    }
    
    await kv.del(postKey);
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return c.json({ error: 'Internal server error while deleting post' }, 500);
  }
});

// Delete all posts for the user (for a specific feed)
app.delete("/make-server-af67b925/posts", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log('🗑️ DELETE ALL POSTS request from user:', user.id);
    
    const feedNumber = c.req.query('feedNumber') || '1';
    
    // Try NEW format first (with feed number)
    let posts = await kv.getByPrefix(`user:${user.id}:feed:${feedNumber}:post:`);
    console.log(`📥 Posts found with NEW format (feed:${feedNumber}:post:):`, posts.length);
    
    // If no posts found with new format, try OLD format (without feed number)
    if (posts.length === 0) {
      console.log('🔄 Trying OLD format without feed number...');
      posts = await kv.getByPrefix(`user:${user.id}:post:`);
      console.log(`📥 Posts found with OLD format (post:):`, posts.length);
    }
    
    if (posts.length > 0) {
      console.log(`🗑️ Deleting ${posts.length} posts metadata (keeping storage files)...`);
      
      // ⚠️ IMPORTANT: DO NOT delete images from storage during autosave!
      // Images will be reused via EXISTING_PATH: prefix
      // Only delete metadata from KV store
      
      const deletePromises: Promise<void>[] = [];
      
      posts.forEach((post: any) => {
        // Try deleting with both old and new key formats
        const oldKey = `user:${user.id}:post:${post.id}`;
        const newKey = `user:${user.id}:feed:${feedNumber}:post:${post.id}`;
        
        console.log(`🗑️ Deleting metadata keys: ${oldKey}, ${newKey}`);
        deletePromises.push(kv.del(oldKey));
        deletePromises.push(kv.del(newKey));
      });
      
      await Promise.all(deletePromises);
      console.log(`✅ Deleted all post metadata from KV store (storage files preserved)`);
    } else {
      console.log('ℹ️ No posts found to delete');
    }
    
    return c.json({ success: true, deletedCount: posts.length });
  } catch (error) {
    console.error('❌ Error deleting all posts:', error);
    return c.json({ error: 'Internal server error while deleting all posts' }, 500);
  }
});

// Share a feed with another user
app.post("/make-server-af67b925/feeds/share", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const body = await c.req.json();
    const { email, feedNumber = '1' } = body;
    
    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }
    
    // Find the user by email using Supabase Admin
    const supabase = getSupabaseClient();
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error finding user:', userError);
      return c.json({ error: 'Failed to find user' }, 500);
    }
    
    const targetUser = users.users.find(u => u.email === email);
    
    if (!targetUser) {
      return c.json({ error: 'Felhasználó nem található ezzel az email címmel' }, 404);
    }
    
    if (targetUser.id === user.id) {
      return c.json({ error: 'Nem oszthatod meg saját magaddal a feedet' }, 400);
    }
    
    // Save share information
    const shareKey = `share:${user.id}:feed:${feedNumber}:user:${targetUser.id}`;
    await kv.set(shareKey, {
      ownerId: user.id,
      ownerEmail: user.email,
      sharedWithId: targetUser.id,
      sharedWithEmail: targetUser.email,
      feedNumber,
      sharedAt: new Date().toISOString()
    });
    
    console.log(`✅ Feed ${feedNumber} shared with ${email}`);
    return c.json({ success: true, message: `Feed megosztva ${email} címmel` });
  } catch (error) {
    console.error('Error sharing feed:', error);
    return c.json({ error: 'Internal server error while sharing feed' }, 500);
  }
});

// Get list of users that a feed is shared with
app.get("/make-server-af67b925/feeds/shares", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const feedNumber = c.req.query('feedNumber') || '1';
    
    // Get all shares for this user's feed
    const shares = await kv.getByPrefix(`share:${user.id}:feed:${feedNumber}:user:`);
    
    console.log(`📋 Found ${shares.length} shares for feed ${feedNumber}`);
    
    return c.json({ shares });
  } catch (error) {
    console.error('Error getting shares:', error);
    return c.json({ error: 'Internal server error while getting shares' }, 500);
  }
});

// Get feeds shared WITH the current user (feeds that others shared with me)
app.get("/make-server-af67b925/feeds/shared-with-me", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log(`🔍 Looking for feeds shared with user: ${user.id}`);
    
    // Get ALL shares from all users
    const allShares = await kv.getByPrefix(`share:`);
    
    console.log(`📋 Total shares in database: ${allShares.length}`);
    
    // Filter to only shares where sharedWithId matches current user
    const sharedWithMe = allShares.filter((share: any) => {
      const isSharedWithMe = share.sharedWithId === user.id;
      console.log(`  Checking share:`, {
        ownerId: share.ownerId,
        ownerEmail: share.ownerEmail,
        sharedWithId: share.sharedWithId,
        currentUserId: user.id,
        match: isSharedWithMe
      });
      return isSharedWithMe;
    });
    
    console.log(`✅ Found ${sharedWithMe.length} feeds shared with me`);
    
    return c.json({ feeds: sharedWithMe });
  } catch (error) {
    console.error('Error getting shared feeds:', error);
    return c.json({ error: 'Internal server error while getting shared feeds' }, 500);
  }
});

// Revoke feed share
app.delete("/make-server-af67b925/feeds/share/:sharedWithId", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const sharedWithId = c.req.param('sharedWithId');
    const feedNumber = c.req.query('feedNumber') || '1';
    
    if (!sharedWithId) {
      return c.json({ error: 'User ID is required' }, 400);
    }
    
    // Delete the share
    const shareKey = `share:${user.id}:feed:${feedNumber}:user:${sharedWithId}`;
    await kv.del(shareKey);
    
    console.log(`🗑️ Revoked share for feed ${feedNumber} from user ${sharedWithId}`);
    return c.json({ success: true, message: 'Megosztás visszavonva' });
  } catch (error) {
    console.error('Error revoking share:', error);
    return c.json({ error: 'Internal server error while revoking share' }, 500);
  }
});

// View a shared feed (for users who have access)
app.get("/make-server-af67b925/feeds/view/:ownerId/:feedNumber", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const ownerId = c.req.param('ownerId');
    const feedNumber = c.req.param('feedNumber');
    
    console.log(`👀 User ${user.id} requesting to view feed ${feedNumber} of user ${ownerId}`);
    
    // Check if the feed is shared with this user
    const shareKey = `share:${ownerId}:feed:${feedNumber}:user:${user.id}`;
    const shareData = await kv.get(shareKey);
    
    if (!shareData) {
      console.log(`❌ Access denied: feed not shared with user ${user.id}`);
      return c.json({ error: 'Nincs hozzáférésed ehhez a feedhez' }, 403);
    }
    
    console.log(`✅ Access granted to shared feed`);
    
    // Load the owner's posts for this feed
    // Try NEW format first (with feed number)
    let posts = await kv.getByPrefix(`user:${ownerId}:feed:${feedNumber}:post:`);
    console.log(`📋 Found ${posts.length} posts with NEW format (feed:${feedNumber}:post:)`);
    
    // If no posts found with new format, try OLD format (without feed number)
    if (posts.length === 0) {
      console.log('🔄 Trying OLD format without feed number...');
      posts = await kv.getByPrefix(`user:${ownerId}:post:`);
      console.log(`📋 Found ${posts.length} posts with OLD format (post:)`);
    }
    
    // Verify and generate signed URLs for images
    const supabase = getSupabaseClient();
    const postsWithUrls = await Promise.all(
      posts.map(async (post: any) => {
        if (post.imagePath) {
          console.log(`🔍 Processing image for post ${post.id}, imagePath: ${post.imagePath}`);
          
          const { data: fileData, error: fileError } = await supabase.storage
            .from(BUCKET_NAME)
            .list(post.imagePath.substring(0, post.imagePath.lastIndexOf('/')), {
              search: post.imagePath.substring(post.imagePath.lastIndexOf('/') + 1)
            });
          
          if (fileError || !fileData || fileData.length === 0) {
            console.log(`⚠️ Storage file not found: ${post.imagePath}, removing image reference`);
            return { ...post, image: null };
          }
          
          const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from(BUCKET_NAME)
            .createSignedUrl(post.imagePath, 3600);
          
          if (signedUrlError || !signedUrlData) {
            console.error(`❌ Error creating signed URL for ${post.imagePath}:`, signedUrlError);
            return { ...post, image: null };
          }
          
          console.log(`✅ Generated signed URL for ${post.imagePath}`);
          return { ...post, image: signedUrlData.signedUrl };
        }
        return post;
      })
    );
    
    return c.json({ posts: postsWithUrls });
  } catch (error) {
    console.error('Error viewing shared feed:', error);
    return c.json({ error: 'Internal server error while viewing shared feed' }, 500);
  }
});

// Update notes for a post in a shared feed (collaborative editing)
app.put("/make-server-af67b925/feeds/:ownerId/:feedNumber/posts/:postId/notes", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const ownerId = c.req.param('ownerId');
    const feedNumber = c.req.param('feedNumber');
    const postId = c.req.param('postId');
    
    console.log(`📝 User ${user.id} updating notes for post ${postId} in feed ${feedNumber} of user ${ownerId}`);
    
    // Check if the user has access to this feed
    // Either they own it OR it's shared with them
    let hasAccess = false;
    
    if (user.id === ownerId) {
      console.log('✅ User is the owner');
      hasAccess = true;
    } else {
      const shareKey = `share:${ownerId}:feed:${feedNumber}:user:${user.id}`;
      const shareData = await kv.get(shareKey);
      if (shareData) {
        console.log('✅ Feed is shared with user');
        hasAccess = true;
      }
    }
    
    if (!hasAccess) {
      console.log('❌ Access denied');
      return c.json({ error: 'Nincs hozzáférésed ehhez a feedhez' }, 403);
    }
    
    const body = await c.req.json();
    const { notes } = body;
    
    console.log('📝 New notes:', notes);
    
    // Try to get the post (try both formats)
    let postKey = `user:${ownerId}:feed:${feedNumber}:post:${postId}`;
    let post = await kv.get(postKey);
    
    if (!post) {
      // Try old format
      postKey = `user:${ownerId}:post:${postId}`;
      post = await kv.get(postKey);
    }
    
    if (!post) {
      console.log('❌ Post not found');
      return c.json({ error: 'Poszt nem található' }, 404);
    }
    
    // Update only the notes field
    const updatedPost = {
      ...post,
      notes: notes || null,
      notesUpdatedAt: new Date().toISOString(),
      notesUpdatedBy: user.id
    };
    
    await kv.set(postKey, updatedPost);
    
    console.log('✅ Notes updated successfully');
    return c.json({ success: true, post: updatedPost });
  } catch (error) {
    console.error('Error updating notes:', error);
    return c.json({ error: 'Internal server error while updating notes' }, 500);
  }
});

// FORCE Recovery endpoint - DELETE ALL posts and restore EVERYTHING from Storage
app.post("/make-server-af67b925/force-recovery", async (c) => {
  try {
    const { user, error } = await verifyUser(c.req.header('Authorization'));
    
    if (error || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log('💥 FORCE RECOVERY - Deleting ALL posts and restoring from Storage');
    
    const supabase = getSupabaseClient();
    
    // STEP 1: DELETE ALL EXISTING POSTS FROM DATABASE
    console.log('🗑️ STEP 1: Deleting all existing posts from database...');
    const oldFormatPosts = await kv.getByPrefix(`user:${user.id}:post:`);
    const feed1Posts = await kv.getByPrefix(`user:${user.id}:feed:1:post:`);
    const feed2Posts = await kv.getByPrefix(`user:${user.id}:feed:2:post:`);
    const feed3Posts = await kv.getByPrefix(`user:${user.id}:feed:3:post:`);
    
    const allPosts = [...oldFormatPosts, ...feed1Posts, ...feed2Posts, ...feed3Posts];
    console.log(`  Found ${allPosts.length} posts to delete`);
    
    for (const post of allPosts) {
      const keys = [
        `user:${user.id}:post:${post.id}`,
        `user:${user.id}:feed:1:post:${post.id}`,
        `user:${user.id}:feed:2:post:${post.id}`,
        `user:${user.id}:feed:3:post:${post.id}`
      ];
      for (const key of keys) {
        await kv.del(key);
      }
    }
    console.log('✅ All posts deleted from database');
    
    // STEP 2: LIST ALL FILES FROM STORAGE
    console.log('📁 STEP 2: Listing all files from Storage...');
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET_NAME)
      .list(user.id);
    
    if (listError || !files || files.length === 0) {
      console.error('❌ No files found in storage:', listError);
      return c.json({ error: 'No files found in Storage', details: listError?.message }, 500);
    }
    
    console.log(`  Found ${files.length} files in Storage`);
    
    // STEP 3: GROUP FILES BY POST ID AND FIND LATEST FOR EACH
    console.log('🎯 STEP 3: Grouping files by Post ID and finding latest...');
    const postIdToLatestFile = new Map<number, { file: any, timestamp: number }>();
    
    for (const file of files) {
      const match = file.name.match(/^(\d+)-(\d+)/);
      if (!match) {
        console.log(`  ⏭️ Skipping invalid filename: ${file.name}`);
        continue;
      }
      
      const postId = parseInt(match[1]);
      const timestamp = parseInt(match[2]);
      
      const existing = postIdToLatestFile.get(postId);
      if (!existing || timestamp > existing.timestamp) {
        postIdToLatestFile.set(postId, { file, timestamp });
      }
    }
    
    console.log(`  Found ${postIdToLatestFile.size} unique Post IDs`);
    
    // STEP 4: RESTORE ALL POSTS TO DATABASE
    console.log('♻️ STEP 4: Restoring all posts to database...');
    let restored = 0;
    
    for (const [postId, { file }] of postIdToLatestFile.entries()) {
      const imagePath = `${user.id}/${file.name}`;
      const postKey = `user:${user.id}:post:${postId}`;
      
      const postData = {
        id: postId,
        caption: null,
        scheduledTime: null,
        notes: null,
        imagePath: imagePath,
        restoredAt: new Date().toISOString()
      };
      
      await kv.set(postKey, postData);
      restored++;
      console.log(`  ✅ Restored Post ${postId} with image ${file.name}`);
    }
    
    console.log(`🎉 FORCE RECOVERY COMPLETE!`);
    console.log(`  • Total files in Storage: ${files.length}`);
    console.log(`  • Unique posts restored: ${restored}`);
    
    return c.json({ 
      success: true, 
      message: `${restored} kép visszaállítva a Storage-ból!`,
      restored,
      totalFiles: files.length
    });
  } catch (error: any) {
    console.error('❌ Force recovery error:', error);
    return c.json({ error: 'Recovery failed', details: error.message }, 500);
  }
});

Deno.serve(app.fetch);