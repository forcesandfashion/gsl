import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Upload,
  X,
  Target,
  Send,
  Filter
} from "lucide-react";
import { db, storage } from "@/firebase/config";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentData,
  serverTimestamp,
  onSnapshot,
  getDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

interface Post {
  id: string;
  title: string;
  description: string;
  images: string[];
  authorId: string;
  authorName: string;
  authorType: 'range_owner' | 'shooter';
  authorProfilePic?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likes: string[];
  comments: Comment[];
  views: number;
  status: 'published' | 'draft';
}

interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userType: 'range_owner' | 'shooter';
  profilePic?: string;
  content: string;
  timestamp: Timestamp;
}

interface CreatePostForm {
  title: string;
  description: string;
  images: string[];
  status: 'published' | 'draft';
}

const ImageCarousel = ({ images, alt }: { images: string[]; alt: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="w-full h-64 bg-slate-200 rounded-lg flex items-center justify-center">
        <ImageIcon className="w-12 h-12 text-slate-400" />
      </div>
    );
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-64 rounded-lg overflow-hidden bg-slate-100">
      <img
        src={images[currentIndex]}
        alt={`${alt} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded-full text-xs">
            {currentIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

export default function CommunityPage() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [filterUserType, setFilterUserType] = useState<'all' | 'range_owner' | 'shooter'>('all');
  const [comments, setComments] = useState<{[postId: string]: Comment[]}>({});
  const [newComment, setNewComment] = useState<{[postId: string]: string}>({});
  const [showComments, setShowComments] = useState<{[postId: string]: boolean}>({});

  // Create Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreatePostForm>({
    title: '',
    description: '',
    images: [],
    status: 'published'
  });
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const observerTarget = useRef(null);

  // Get user display name and profile info
  const getUserDisplayName = () => {
    if (!user?.displayName) return user?.email?.split('@')[0] || 'User';
    return user.displayName.split('|')[0] || 'User';
  };

  const getUserProfilePic = () => {
    return user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=2b6cb0&color=fff`;
  };

  // Get user profile from Firestore based on role
  const getUserProfile = async (userId: string, userRole: string) => {
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

  const getUserIcon = (userType: string) => {
    return userType === 'range_owner' ? (
      <Target className="w-4 h-4 text-orange-500" />
    ) : (
      <User className="w-4 h-4 text-blue-500" />
    );
  };

  // Load posts with pagination
  const loadPosts = async (isInitial = false) => {
    if (loading || (!hasMore && !isInitial)) return;
    
    setLoading(true);
    
    try {
      console.log('Loading posts...', { isInitial, hasMore });
      
      // First, let's try a simple query without status filter to see if posts exist
      let postsQuery = query(
        collection(db, 'posts'),
        orderBy('createdAt', 'desc'),
        limit(6)
      );

      if (!isInitial && lastVisible) {
        postsQuery = query(
          collection(db, 'posts'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(6)
        );
      }

      const querySnapshot = await getDocs(postsQuery);
      console.log('Found posts:', querySnapshot.docs.length);
      
      const newPosts: Post[] = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data() as DocumentData;
        console.log('Processing post:', docSnapshot.id, data);
        
        // Only include published posts or posts without status field (assuming they're published)
        if (data.status && data.status !== 'published') {
          console.log('Skipping non-published post:', docSnapshot.id, data.status);
          continue;
        }
        
        // Get likes for this post (simplified - just count for now)
        let likes: string[] = [];
        try {
          const likesQuery = query(
            collection(db, 'likes'),
            where('postId', '==', docSnapshot.id)
          );
          const likesSnapshot = await getDocs(likesQuery);
          likes = likesSnapshot.docs.map(doc => doc.data().userId);
        } catch (likesError) {
          console.log('Error loading likes for post', docSnapshot.id, likesError);
        }

        // Get comments for this post (simplified)
        let postComments: Comment[] = [];
        try {
          const commentsQuery = query(
            collection(db, 'comments'),
            where('postId', '==', docSnapshot.id)
          );
          const commentsSnapshot = await getDocs(commentsQuery);
          postComments = commentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Comment[];
        } catch (commentsError) {
          console.log('Error loading comments for post', docSnapshot.id, commentsError);
        }

        // Parse author name and type
        const authorName = data.authorName || data.userName || 'Anonymous';
        let parsedAuthorName = authorName;
        let authorType = data.authorType || data.userType || 'shooter';
        
        // Check if authorName contains the type (e.g., "deepak singh rana|range_owner")
        if (typeof authorName === 'string' && authorName.includes('|')) {
          const parts = authorName.split('|');
          parsedAuthorName = parts[0].trim();
          authorType = parts[1].trim() || authorType;
        }

        const post: Post = {
          id: docSnapshot.id,
          title: data.title || 'Untitled',
          description: data.description || data.content || '',
          images: data.images || (data.imageUrl ? [data.imageUrl] : []),
          authorId: data.authorId || data.userId || '',
          authorName: parsedAuthorName,
          authorType: authorType,
          authorProfilePic: data.authorProfilePic || data.profilePic,
          createdAt: data.createdAt || data.timestamp || Timestamp.now(),
          updatedAt: data.updatedAt,
          likes: likes,
          comments: postComments,
          views: data.views || 0,
          status: data.status || 'published'
        };
        
        console.log('Added post:', post);
        newPosts.push(post);
      }

      console.log('Total posts processed:', newPosts.length);

      if (isInitial) {
        setPosts(newPosts);
      } else {
        setPosts(prev => [...prev, ...newPosts]);
      }

      setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 6);
      
      // Set up comments state
      const commentsData: {[postId: string]: Comment[]} = {};
      newPosts.forEach(post => {
        commentsData[post.id] = post.comments;
      });
      setComments(prev => ({ ...prev, ...commentsData }));
      
    } catch (error) {
      console.error('Error loading posts:', error);
      console.error('Error details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort posts
  useEffect(() => {
    let filtered = [...posts];
    
    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.authorName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by user type
    if (filterUserType !== 'all') {
      filtered = filtered.filter(post => post.authorType === filterUserType);
    }
    
    // Sort posts
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        case 'oldest':
          const aTimeOld = a.createdAt?.seconds || 0;
          const bTimeOld = b.createdAt?.seconds || 0;
          return aTimeOld - bTimeOld;
        case 'popular':
          const aPopularity = (a.likes?.length || 0) + (a.comments?.length || 0) + (a.views || 0);
          const bPopularity = (b.likes?.length || 0) + (b.comments?.length || 0) + (b.views || 0);
          return bPopularity - aPopularity;
        default:
          return 0;
      }
    });
    
    setFilteredPosts(filtered);
  }, [posts, searchQuery, sortBy, filterUserType]);

  // Handle image upload
  const handleImageUpload = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    const urls: string[] = [];
    
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      urls.push(url);
    });
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setImagePreviewUrls(prev => [...prev, ...urls]);
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(imagePreviewUrls[index]);
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImagesToStorage = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file, index) => {
      const timestamp = Date.now();
      const fileName = `posts/${user?.uid}/${timestamp}_${index}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    });
    
    return Promise.all(uploadPromises);
  };

  // Create new post
  const createPost = async () => {
    if (!user || !createForm.title.trim() || !createForm.description.trim()) return;
    
    try {
      setUploading(true);
      
      // Get current user's profile info
      const profileInfo = await getUserProfile(user.uid, userRole || 'shooter');
      
      // Upload images to Firebase Storage
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        imageUrls = await uploadImagesToStorage(selectedFiles);
      }
      
      const postData = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        images: imageUrls,
        authorId: user.uid,
        authorName: profileInfo.name,
        authorType: userRole || 'shooter',
        authorProfilePic: profileInfo.profilePic,
        createdAt: serverTimestamp(),
        views: 0,
        status: createForm.status
      };
      
      await addDoc(collection(db, "posts"), postData);
      
      // Clean up blob URLs
      imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
      
      // Reset form
      setCreateForm({
        title: '',
        description: '',
        images: [],
        status: 'published'
      });
      setImagePreviewUrls([]);
      setSelectedFiles([]);
      setIsCreateModalOpen(false);
      
      // Reload posts
      loadPosts(true);
      
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setUploading(false);
    }
  };

  // Toggle like
  const toggleLike = async (postId: string) => {
    if (!user) return;
    
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;
      
      const hasLiked = post.likes.includes(user.uid);
      
      if (hasLiked) {
        // Remove like
        const likesQuery = query(
          collection(db, 'likes'),
          where('postId', '==', postId),
          where('userId', '==', user.uid)
        );
        const likesSnapshot = await getDocs(likesQuery);
        
        for (const likeDoc of likesSnapshot.docs) {
          await deleteDoc(doc(db, 'likes', likeDoc.id));
        }
        
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, likes: p.likes.filter(uid => uid !== user.uid) }
            : p
        ));
      } else {
        // Add like
        const likeData = {
          postId,
          userId: user.uid,
          timestamp: serverTimestamp()
        };
        
        await addDoc(collection(db, 'likes'), likeData);
        
        setPosts(prev => prev.map(p => 
          p.id === postId 
            ? { ...p, likes: [...p.likes, user.uid] }
            : p
        ));
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Add comment
  const addComment = async (postId: string) => {
    const commentContent = newComment[postId];
    if (!commentContent?.trim() || !user) return;
    
    try {
      const profileInfo = await getUserProfile(user.uid, userRole || 'shooter');
      
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
      
      const newCommentWithId = {
        id: docRef.id,
        ...commentData,
        timestamp: Timestamp.now()
      } as Comment;
      
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newCommentWithId]
      }));
      
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, comments: [...p.comments, newCommentWithId] }
          : p
      ));
      
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Format timestamp
  const formatTime = (timestamp?: Timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'N/A';
    
    try {
      const date = timestamp.toDate();
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
    } catch (error) {
      return 'N/A';
    }
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
    if (!authLoading) {
      loadPosts(true);
    }
  }, [authLoading]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
          <p className="text-slate-600">Discover and share with the shooting community</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Posts</label>
                <Input
                  placeholder="Search posts, authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by User Type</label>
                <select
                  value={filterUserType}
                  onChange={(e) => setFilterUserType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Users</option>
                  <option value="range_owner">Range Owners</option>
                  <option value="shooter">Shooters</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              {user && (
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create New Post</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Title</label>
                        <Input
                          placeholder="Enter post title..."
                          value={createForm.title}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Description</label>
                        <Textarea
                          placeholder="Write your post description..."
                          rows={4}
                          value={createForm.description}
                          onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Images</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-4">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e.target.files)}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center gap-2">
                            <Upload className="w-8 h-8 text-slate-400" />
                            <span className="text-sm text-slate-600">Click to upload images</span>
                          </label>
                        </div>
                        {imagePreviewUrls.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            {imagePreviewUrls.map((url, index) => (
                              <div key={index} className="relative">
                                <img src={url} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded" />
                                <button
                                  onClick={() => removeImage(index)}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button 
                          onClick={createPost} 
                          className="flex-1"
                          disabled={uploading || !createForm.title.trim() || !createForm.description.trim()}
                        >
                          {uploading ? 'Creating...' : 'Create Post'}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setIsCreateModalOpen(false)}
                          disabled={uploading}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid */}
        {loading && filteredPosts.length === 0 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading posts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <ImageCarousel images={post.images} alt={post.title} />
                  <Badge
                    variant="default"
                    className="absolute top-2 left-2"
                  >
                    {post.status}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-slate-600 text-sm mb-3 line-clamp-3">{post.description}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <img
                      src={post.authorProfilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=2b6cb0&color=fff`}
                      alt={post.authorName}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.authorName)}&background=2b6cb0&color=fff`;
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1">
                        {getUserIcon(post.authorType)}
                        <span className="font-medium text-sm">{post.authorName}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        <span>{formatTime(post.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex gap-4">
                      <button
                        onClick={() => toggleLike(post.id)}
                        disabled={!user}
                        className={`flex items-center gap-1 transition-colors ${
                          user && post.likes.includes(user.uid)
                            ? 'text-red-500'
                            : 'text-gray-600 hover:text-red-500'
                        } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            user && post.likes.includes(user.uid) ? 'fill-current' : ''
                          }`}
                        />
                        <span className="text-xs">{post.likes.length}</span>
                      </button>
                      
                      <button
                        onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        className="flex items-center gap-1 text-gray-600 hover:text-blue-500 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-xs">{post.comments.length}</span>
                      </button>
                      
                      <div className="flex items-center gap-1 text-gray-600">
                        <Eye className="w-4 h-4" />
                        <span className="text-xs">{post.views}</span>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {showComments[post.id] && (
                    <div className="border-t border-gray-100 mt-3 pt-3">
                      {/* Existing Comments */}
                      <div className="max-h-48 overflow-y-auto mb-3">
                        {comments[post.id]?.map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2 mb-3 text-sm">
                            <img
                              src={comment.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=2b6cb0&color=fff`}
                              alt={comment.userName}
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName)}&background=2b6cb0&color=fff`;
                              }}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-1 mb-1">
                                {getUserIcon(comment.userType)}
                                <span className="font-medium text-xs">{comment.userName}</span>
                                <span className="text-xs text-gray-500">{formatTime(comment.timestamp)}</span>
                              </div>
                              <p className="text-xs text-gray-700">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Add Comment */}
                      {user ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={getUserProfilePic()}
                            alt={getUserDisplayName()}
                            className="w-6 h-6 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(getUserDisplayName())}&background=2b6cb0&color=fff`;
                            }}
                          />
                          <div className="flex-1 flex items-center gap-1">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment[post.id] || ''}
                              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                              className="text-xs"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addComment(post.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => addComment(post.id)}
                              disabled={!newComment[post.id]?.trim()}
                              className="h-8 w-8 p-0"
                            >
                              <Send className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs text-gray-500">Sign in to leave a comment</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading More Posts */}
        {loading && filteredPosts.length > 0 && (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Intersection Observer Target */}
        {hasMore && <div ref={observerTarget} className="h-1" />}

        {/* No More Posts */}
        {!hasMore && filteredPosts.length > 0 && (
          <div className="text-center py-6 text-gray-500">
            No more posts to load
          </div>
        )}

        {/* No Posts */}
        {!loading && filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No posts found</h3>
            <p className="text-slate-500">
              {posts.length === 0 
                ? "Be the first to share something with the community!" 
                : "Try adjusting your search criteria."
              }
            </p>
          </div>
        )}

        {/* Sign In Prompt */}
        {!user && (
          <Card className="mt-6">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Join the Community</h3>
              <p className="text-gray-600 mb-4">Sign in to create posts, like, and comment on community content.</p>
              <Button 
                onClick={() => window.location.href = '/login'}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}