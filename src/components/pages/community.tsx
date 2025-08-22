import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Send, Camera, X, Target, User, Plus } from 'lucide-react';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  startAfter, 
  where, 
  serverTimestamp, 
  deleteDoc, 
  doc,
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config'; // Adjust path as needed
import { useAuth } from '../../firebase/auth'; // Adjust path as needed

const CommunityPage = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', image: null });
  const [likes, setLikes] = useState({});
  const [comments, setComments] = useState({});
  const [showComments, setShowComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [uploading, setUploading] = useState(false);
  const observerTarget = useRef(null);
  const fileInputRef = useRef(null);

  // Get user display name and profile info
  const getUserDisplayName = () => {
    if (!user?.displayName) return user?.email?.split('@')[0] || 'User';
    return user.displayName.split('|')[0] || 'User';
  };

  const getUserProfilePic = () => {
    return user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=2b6cb0&color=fff`;
  };

  // Get user profile from Firestore based on role
  const getUserProfile = async (userId, userRole) => {
    try {
      let userDoc;
      if (userRole === 'range_owner') {
        userDoc = await getDoc(doc(db, 'range-owners', userId));
      } else {
        userDoc = await getDoc(doc(db, 'shooters', userId));
      }
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          name: data.fullName || data.name || data.username || 'User',
          profilePic: data.profileImage || data.logoUrl || getUserProfilePic()
        };
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return {
      name: getUserDisplayName(),
      profilePic: getUserProfilePic()
    };
  };

  // Load posts with pagination
  const loadPosts = async (isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;
    
    setLoading(true);
    if (isInitial) setLoadingPosts(true);
    
    try {
      let postsQuery = query(
        collection(db, 'posts'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      if (!isInitial && lastVisible) {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisible),
          limit(5)
        );
      }

      const querySnapshot = await getDocs(postsQuery);
      const newPosts = [];
      
      querySnapshot.forEach((doc) => {
        newPosts.push({ id: doc.id, ...doc.data() });
      });

      if (isInitial) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 5);
      
      // Load likes and comments for new posts
      await loadLikesForPosts(newPosts.map(p => p.id));
      await loadCommentsForPosts(newPosts.map(p => p.id));
      
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
      setLoadingPosts(false);
    }
  };

  // Load likes for specific posts
  const loadLikesForPosts = async (postIds) => {
    try {
      if (postIds.length === 0) return;
      
      const likesQuery = query(
        collection(db, 'likes'),
        where('postId', 'in', postIds)
      );
      
      const querySnapshot = await getDocs(likesQuery);
      const likesData = {};
      
      querySnapshot.forEach((doc) => {
        const like = doc.data();
        if (!likesData[like.postId]) {
          likesData[like.postId] = [];
        }
        likesData[like.postId].push({ id: doc.id, ...like });
      });
      
      setLikes(prev => ({ ...prev, ...likesData }));
    } catch (error) {
      console.error('Error loading likes:', error);
    }
  };

  // Load comments for specific posts
  const loadCommentsForPosts = async (postIds) => {
    try {
     
      
      const commentsQuery = query(
        collection(db, 'comments'),
        where('postId', 'in', postIds)
      
      );
      
      const querySnapshot = await getDocs(commentsQuery);
      const commentsData = {};
      
      querySnapshot.forEach((doc) => {
        const comment = doc.data();
        if (!commentsData[comment.postId]) {
          commentsData[comment.postId] = [];
        }
        commentsData[comment.postId].push({ id: doc.id, ...comment });
      });
      
      setComments(prev => ({ ...prev, ...commentsData }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (file) => {
    const imageRef = ref(storage, `posts/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(imageRef, file);
    return await getDownloadURL(snapshot.ref);
  };

  // Create new post
  const createPost = async () => {
    if (!newPost.content.trim() || !user) return;
    
    setUploading(true);
    try {
      // Get current user's profile info
      const profileInfo = await getUserProfile(user.uid, userRole);
      
      let imageUrl = '';
      if (newPost.image) {
        imageUrl = await uploadImage(newPost.image);
      }

      const postData = {
        userId: user.uid,
        userName: profileInfo.name,
        userType: userRole || 'shooter',
        profilePic: profileInfo.profilePic,
        content: newPost.content.trim(),
        imageUrl,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, 'posts'), postData);
      
      // Reset form
      setNewPost({ content: '', image: null });
      setShowCreatePost(false);
      
      // Reload posts
      await loadPosts(true);
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Toggle like
  const toggleLike = async (postId) => {
    if (!user) return;
    
    try {
      const postLikes = likes[postId] || [];
      const existingLike = postLikes.find(like => like.userId === user.uid);
      
      if (existingLike) {
        // Remove like
        await deleteDoc(doc(db, 'likes', existingLike.id));
        setLikes(prev => ({
          ...prev,
          [postId]: prev[postId].filter(like => like.id !== existingLike.id)
        }));
      } else {
        // Add like
        const likeData = {
          postId,
          userId: user.uid,
          timestamp: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'likes'), likeData);
        setLikes(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), { id: docRef.id, ...likeData }]
        }));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Error updating like. Please try again.');
    }
  };

  // Add comment
  const addComment = async (postId) => {
    const commentContent = newComment[postId];
    if (!commentContent?.trim() || !user) return;
    
    try {
      // Get current user's profile info
      const profileInfo = await getUserProfile(user.uid, userRole);
      
      const commentData = {
        postId,
        userId: user.uid,
        userName: profileInfo.name,
        userType: userRole || 'shooter',
        profilePic: profileInfo.profilePic,
        content: commentContent.trim(),
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'comments'), commentData);
      
      // Add the comment to local state with current timestamp for immediate display
      const newCommentWithId = {
        id: docRef.id,
        ...commentData,
        timestamp: new Date() // Use current date for immediate display
      };
      
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newCommentWithId]
      }));
      
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Error adding comment. Please try again.');
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setNewPost(prev => ({ ...prev, image: file }));
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadPosts();
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  // Initial load
  useEffect(() => {
    if (user && !authLoading) {
      loadPosts(true);
    }
  }, [user, authLoading]);

  const getUserIcon = (userType) => {
    return userType === 'range_owner' ? (
      <Target className="w-4 h-4 text-orange-500" />
    ) : (
      <User className="w-4 h-4 text-blue-500" />
    );
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Community</h2>
          <p className="text-gray-600 mb-6">Please sign in to view and create posts.</p>
          <button 
            onClick={() => window.location.href = '/login'} // Adjust based on your routing
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Community</h1>
          <button
            onClick={() => setShowCreatePost(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Post
          </button>
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Create New Post</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={getUserProfilePic()}
                  alt={getUserDisplayName()}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=2b6cb0&color=fff`;
                  }}
                />
                <div className="flex items-center gap-2">
                  {getUserIcon(userRole || 'shooter')}
                  <span className="font-medium text-gray-800">{getUserDisplayName()}</span>
                </div>
              </div>
              
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                placeholder="What's on your mind?"
                className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
              
              {newPost.image && (
                <div className="mt-3 relative">
                  <img
                    src={URL.createObjectURL(newPost.image)}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setNewPost(prev => ({ ...prev, image: null }))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Camera className="w-4 h-4" />
                    Photo
                  </button>
                </div>
                
                <button
                  onClick={createPost}
                  disabled={!newPost.content.trim() || uploading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Loading */}
      {loadingPosts && (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Posts List */}
      <div className="space-y-6">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Post Header */}
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={post.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName)}&background=2b6cb0&color=fff`}
                  alt={post.userName}
                  className="w-10 h-10 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userName)}&background=2b6cb0&color=fff`;
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {getUserIcon(post.userType)}
                    <span className="font-medium text-gray-800">{post.userName}</span>
                  </div>
                  <span className="text-sm text-gray-500">{formatTime(post.timestamp)}</span>
                </div>
              </div>
              
              <p className="text-gray-800 mb-3">{post.content}</p>
              
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post content"
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}
            </div>

            {/* Post Actions */}
            <div className="px-4 py-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1 transition-colors ${
                      likes[post.id]?.some(like => like.userId === user.uid)
                        ? 'text-red-500'
                        : 'text-gray-600 hover:text-red-500'
                    }`}
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        likes[post.id]?.some(like => like.userId === user.uid)
                          ? 'fill-current'
                          : ''
                      }`}
                    />
                    <span>{likes[post.id]?.length || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                    className="flex items-center gap-1 text-gray-600 hover:text-blue-500 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{comments[post.id]?.length || 0}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Comments Section */}
            {showComments[post.id] && (
              <div className="border-t border-gray-100">
                {/* Existing Comments */}
                {comments[post.id]?.map((comment) => (
                  <div key={comment.id} className="p-4 border-b border-gray-50">
                    <div className="flex items-start gap-3">
                      <img
                        src={comment.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=2b6cb0&color=fff`}
                        alt={comment.userName}
                        className="w-8 h-8 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=2b6cb0&color=fff`;
                        }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getUserIcon(comment.userType)}
                          <span className="font-medium text-sm text-gray-800">{comment.userName}</span>
                          <span className="text-xs text-gray-500">{formatTime(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Add Comment */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={getUserProfilePic()}
                      alt={getUserDisplayName()}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=2b6cb0&color=fff`;
                      }}
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={newComment[post.id] || ''}
                        onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Write a comment..."
                        className="flex-1 px-3 py-2 border rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addComment(post.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => addComment(post.id)}
                        disabled={!newComment[post.id]?.trim()}
                        className="text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Loading More Posts */}
      {loading && !loadingPosts && (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Intersection Observer Target */}
      {hasMore && <div ref={observerTarget} className="h-1" />}

      {/* No More Posts */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-6 text-gray-500">
          No more posts to load
        </div>
      )}

      {/* No Posts */}
      {!loadingPosts && posts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No posts yet. Be the first to share something!
        </div>
      )}
    </div>
  );
};

export default CommunityPage;