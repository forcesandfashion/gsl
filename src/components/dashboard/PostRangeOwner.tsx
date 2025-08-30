import React, { useState, useEffect } from "react";
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
  Edit,
  Trash2,
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
  Filter,
  SortAsc,
  SortDesc
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
  Timestamp,
  DocumentData
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

interface Post {
  id: string;
  title: string;
  description: string;
  images: string[];
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likes: number;
  comments: number;
  views: number;
  status: 'published' | 'draft';
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
      <div className="w-full h-48 bg-slate-200 rounded-lg flex items-center justify-center">
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
    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-slate-100">
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

export default function PostRangeOwner() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTitle, setSearchTitle] = useState("");
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'popular'>('newest');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  // Create/Edit Post Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [createForm, setCreateForm] = useState<CreatePostForm>({
    title: '',
    description: '',
    images: [],
    status: 'published'
  });
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  useEffect(() => {
    filterAndSortPosts();
  }, [posts, searchTitle, sortBy, filterStatus]);

  const fetchPosts = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Only fetch current user's posts
      const postsQuery = query(
        collection(db, "posts"),
        where("authorId", "==", user.uid)
      );
      
      const postsSnapshot = await getDocs(postsQuery);
      const postsData = postsSnapshot.docs.map(doc => {
        const data = doc.data() as DocumentData;
        
        // Ensure required fields have default values
        return {
          id: doc.id,
          title: data.title || 'Untitled',
          description: data.description || '',
          images: data.images || [],
          authorId: data.authorId || '',
          authorName: data.authorName || 'Anonymous',
          createdAt: data.createdAt || Timestamp.now(),
          updatedAt: data.updatedAt,
          likes: data.likes || 0,
          comments: data.comments || 0,
          views: data.views || 0,
          status: data.status || 'draft'
        } as Post;
      });
      
      setPosts(postsData);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPosts = () => {
    let filtered = [...posts];
    
    // Filter by title and description search
    if (searchTitle.trim()) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTitle.toLowerCase()) ||
        post.description.toLowerCase().includes(searchTitle.toLowerCase())
      );
    }
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(post => post.status === filterStatus);
    }
    
    // Sort posts with null checks
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
          const aPopularity = (a.likes || 0) + (a.comments || 0) + (a.views || 0);
          const bPopularity = (b.likes || 0) + (b.comments || 0) + (b.views || 0);
          return bPopularity - aPopularity;
        default:
          return 0;
      }
    });
    
    setFilteredPosts(filtered);
  };

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
    // Clean up the blob URL to prevent memory leaks
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

  const createPost = async () => {
    if (!user || !createForm.title.trim() || !createForm.description.trim()) return;
    
    try {
      setUploading(true);
      
      // Upload images to Firebase Storage and get download URLs
      let imageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        imageUrls = await uploadImagesToStorage(selectedFiles);
      }
      
      const postData = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        images: imageUrls,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: Timestamp.now(),
        likes: 0,
        comments: 0,
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
      
      // Refresh posts
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
    } finally {
      setUploading(false);
    }
  };

  const updatePost = async () => {
    if (!editingPost) return;
    
    try {
      setUploading(true);
      
      // Upload new images if any were selected
      let newImageUrls: string[] = [];
      if (selectedFiles.length > 0) {
        newImageUrls = await uploadImagesToStorage(selectedFiles);
      }
      
      // Combine existing images (that weren't removed) with new uploaded images
      const existingImageUrls = editingPost.images.filter(url => 
        imagePreviewUrls.includes(url)
      );
      const finalImageUrls = [...existingImageUrls, ...newImageUrls];
      
      const postRef = doc(db, "posts", editingPost.id);
      await updateDoc(postRef, {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        images: finalImageUrls,
        status: createForm.status,
        updatedAt: Timestamp.now()
      });
      
      // Clean up blob URLs
      imagePreviewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      
      setIsEditModalOpen(false);
      setEditingPost(null);
      setCreateForm({
        title: '',
        description: '',
        images: [],
        status: 'published'
      });
      setImagePreviewUrls([]);
      setSelectedFiles([]);
      fetchPosts();
    } catch (error) {
      console.error("Error updating post:", error);
    } finally {
      setUploading(false);
    }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    
    try {
      await deleteDoc(doc(db, "posts", postId));
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const openEditModal = (post: Post) => {
    setEditingPost(post);
    setCreateForm({
      title: post.title,
      description: post.description,
      images: post.images,
      status: post.status
    });
    setImagePreviewUrls(post.images); // Use existing URLs for display
    setSelectedFiles([]); // Reset selected files
    setIsEditModalOpen(true);
  };

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp || !timestamp.seconds) {
      return "N/A";
    }
    
    try {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Posts</h1>
          <p className="text-slate-600">Manage your personal posts and content</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search & Filter Posts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Posts</label>
                <Input
                  placeholder="Search by title or description..."
                  value={searchTitle}
                  onChange={(e) => setSearchTitle(e.target.value)}
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
                <label className="text-sm font-medium">Filter Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Posts</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span>Total Posts: {posts.length}</span>
                {searchTitle && (
                  <>
                    <span>•</span>
                    <span>Filtered: {filteredPosts.length}</span>
                  </>
                )}
              </div>
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
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <select
                        value={createForm.status}
                        onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value as any }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="published">Published</option>
                        <option value="draft">Draft</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={createPost} 
                        className="flex-1"
                        disabled={uploading}
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
            </div>
          </CardContent>
        </Card>

        {/* Posts Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading your posts...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <ImageCarousel images={post.images} alt={post.title} />
                  <Badge
                    variant={post.status === 'published' ? 'default' : 'secondary'}
                    className="absolute top-2 left-2"
                  >
                    {post.status}
                  </Badge>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-slate-600 text-sm mb-3 line-clamp-2">{post.description}</p>
                  <div className="flex items-center gap-2 mb-3 text-xs text-slate-500">
                    <User className="w-3 h-3" />
                    <span>{post.authorName}</span>
                    <Calendar className="w-3 h-3 ml-2" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        <span>{post.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>{post.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        <span>{post.views}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(post)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deletePost(post.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              {searchTitle ? 'No posts match your search' : 'No posts yet'}
            </h3>
            <p className="text-slate-500 mb-4">
              {searchTitle 
                ? 'Try different keywords or clear your search to see all posts.' 
                : 'Create your first post to get started sharing content.'
              }
            </p>
            {!searchTitle && (
              <Button onClick={() => setIsCreateModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Post
              </Button>
            )}
          </div>
        )}

        {/* Edit Post Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
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
                    id="image-upload-edit"
                  />
                  <label htmlFor="image-upload-edit" className="cursor-pointer flex flex-col items-center gap-2">
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
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <select
                  value={createForm.status}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={updatePost} 
                  className="flex-1"
                  disabled={uploading}
                >
                  {uploading ? 'Updating...' : 'Update Post'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}