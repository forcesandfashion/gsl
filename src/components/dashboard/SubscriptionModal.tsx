import React, { useState, useEffect } from 'react';
import { X, Check, Star, Zap, Shield, Crown, Plus, Minus, Save, IndianRupee } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { db } from "@/firebase/config";
import { doc, setDoc, getDoc, Timestamp } from "firebase/firestore";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  rangeName?: string;
  rangeId: string;
  ownerId: string;
}

interface PricingPlan {
  duration: string;
  months: number;
  price: number;
  enabled: boolean;
}

interface SubscriptionData {
  plans: PricingPlan[];
  features: string[];
  title: string;
  description: string;
  ownerId: string;
  rangeId: string;
  isActive: boolean;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

const defaultPlans: PricingPlan[] = [
  { duration: "1 Month", months: 1, price: 0, enabled: true },
  { duration: "3 Months", months: 3, price: 0, enabled: true },
  { duration: "6 Months", months: 6, price: 0, enabled: true },
  { duration: "12 Months", months: 12, price: 0, enabled: true },
];

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  rangeName = "Your Range",
  rangeId,
  ownerId
}: SubscriptionModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pricing");
  
  // Subscription data state
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    plans: defaultPlans,
    features: [],
    title: `Premium Access to ${rangeName}`,
    description: "Unlock exclusive features and benefits",
    isActive: true,
    ownerId,
    rangeId
  });
  
  const [newFeature, setNewFeature] = useState("");

  // Load existing subscription data
  useEffect(() => {
    if (isOpen && rangeId && ownerId) {
      loadSubscriptionData();
    }
  }, [isOpen, rangeId, ownerId]);

  const loadSubscriptionData = async () => {
    if (!rangeId) {
      console.error("rangeId is required");
      return;
    }

    setLoading(true);
    try {
      // Updated path - using subcollection structure
      const subscriptionDocRef = doc(db, "ranges", rangeId, "subscriptions", "config");
      const subscriptionDoc = await getDoc(subscriptionDocRef);
      
      if (subscriptionDoc.exists()) {
        const data = subscriptionDoc.data() as SubscriptionData;
        setSubscriptionData({
          ...data,
          plans: data.plans && data.plans.length > 0 ? data.plans : defaultPlans,
          features: data.features || [],
          ownerId,
          rangeId
        });
      } else {
        // Document doesn't exist, use defaults
        console.log("No existing subscription data found, using defaults");
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
      toast({
        title: "Error",
        description: "Failed to load subscription settings. Please check your permissions and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSubscriptionData = async () => {
    if (!rangeId || !ownerId) {
      toast({
        title: "Error",
        description: "Missing required information to save subscription",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const now = Timestamp.now();
      const dataToSave: SubscriptionData = {
        ...subscriptionData,
        updatedAt: now,
        createdAt: subscriptionData.createdAt || now,
        ownerId,
        rangeId
      };

      // Store subscription data as a field in the range document
      const subscriptionDocRef = doc(db, "ranges", rangeId);
      await setDoc(subscriptionDocRef, {
        subscriptionSettings: dataToSave
      }, { merge: true }); // Use merge to not overwrite other fields in the range document

      toast({
        title: "Success",
        description: "Subscription settings saved successfully!"
      });
    } catch (error) {
      console.error("Error saving subscription data:", error);
      toast({
        title: "Error",
        description: `Failed to save subscription settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePlan = (index: number, field: keyof PricingPlan, value: any) => {
    setSubscriptionData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => 
        i === index ? { ...plan, [field]: value } : plan
      )
    }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setSubscriptionData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setSubscriptionData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const updateFeature = (index: number, value: string) => {
    setSubscriptionData(prev => ({
      ...prev,
      features: prev.features.map((feature, i) => 
        i === index ? value : feature
      )
    }));
  };

  // Handle price input change to remove placeholder when typing
  const handlePriceChange = (index: number, value: string) => {
    // If the field is empty, set to 0, otherwise parse the number
    const numericValue = value === '' ? 0 : parseFloat(value) || 0;
    updatePlan(index, 'price', numericValue);
  };

  // Calculate savings properly
  const calculateSavings = (plan: PricingPlan, monthlyPrice: number) => {
    if (plan.months <= 1 || plan.price <= 0 || monthlyPrice <= 0) return 0;
    return (plan.months * monthlyPrice) - plan.price;
  };

  if (!isOpen) return null;

  const monthlyPrice = subscriptionData.plans.find(p => p.months === 1)?.price || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-500" />
                Subscription Settings
              </h2>
              <p className="text-gray-600 mt-1">
                Configure pricing and features for <span className="font-semibold">{rangeName}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={saveSubscriptionData}
                disabled={saving || !rangeId || !ownerId}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving ? <LoadingSpinner /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="settings">General Settings</TabsTrigger>
              </TabsList>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Set Your Pricing Plans</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {subscriptionData.plans.map((plan, index) => (
                      <Card key={plan.duration} className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900">{plan.duration}</h4>
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`enabled-${index}`} className="text-sm">Enable</Label>
                              <input
                                id={`enabled-${index}`}
                                type="checkbox"
                                checked={plan.enabled}
                                onChange={(e) => updatePlan(index, 'enabled', e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label htmlFor={`price-${index}`} className="text-sm font-medium">
                              Price (₹)
                            </Label>
                            <div className="relative mt-1">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <IndianRupee className="h-4 w-4 text-gray-500" />
                              </div>
                              <Input
                                id={`price-${index}`}
                                type="number"
                                min="0"
                                step="1"
                                value={plan.price === 0 ? '' : plan.price}
                                onChange={(e) => handlePriceChange(index, e.target.value)}
                                disabled={!plan.enabled}
                                className="pl-8"
                                placeholder="Enter amount"
                              />
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600">
                            {plan.price > 0 && (
                              <p>₹{Math.round(plan.price / plan.months)} per month</p>
                            )}
                            {plan.months > 1 && plan.price > 0 && monthlyPrice > 0 && (
                              <p className="text-green-600">
                                Save ₹{Math.round(calculateSavings(plan, monthlyPrice))} vs monthly
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Features</h3>
                  
                  {/* Add new feature */}
                  <div className="mb-6">
                    <Label htmlFor="new-feature" className="text-sm font-medium">Add Feature</Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        id="new-feature"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="e.g., Priority booking access"
                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                      />
                      <Button onClick={addFeature} disabled={!newFeature.trim()}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Features list */}
                  <div className="space-y-3">
                    {subscriptionData.features.map((feature, index) => (
                      <Card key={index} className="p-4">
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                          <Input
                            value={feature}
                            onChange={(e) => updateFeature(index, e.target.value)}
                            className="flex-1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFeature(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                    
                    {subscriptionData.features.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No features added yet</p>
                        <p className="text-sm">Add features that subscribers will get access to</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subscription-title" className="text-sm font-medium">
                        Subscription Title
                      </Label>
                      <Input
                        id="subscription-title"
                        value={subscriptionData.title}
                        onChange={(e) => setSubscriptionData(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Premium Access to Your Range"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="subscription-description" className="text-sm font-medium">
                        Description
                      </Label>
                      <Textarea
                        id="subscription-description"
                        value={subscriptionData.description}
                        onChange={(e) => setSubscriptionData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe what subscribers get..."
                        className="mt-1"
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        id="subscription-active"
                        type="checkbox"
                        checked={subscriptionData.isActive}
                        onChange={(e) => setSubscriptionData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <Label htmlFor="subscription-active" className="font-medium">
                        Enable subscription for this range
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Preview</h4>
                  <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="text-center">
                      <h5 className="text-xl font-bold text-gray-900 mb-2">
                        {subscriptionData.title}
                      </h5>
                      <p className="text-gray-600 mb-4">
                        {subscriptionData.description}
                      </p>
                      
                      {subscriptionData.features.length > 0 && (
                        <div className="text-left max-w-md mx-auto">
                          <h6 className="font-semibold text-gray-900 mb-2">Features:</h6>
                          <ul className="space-y-1 text-sm">
                            {subscriptionData.features.slice(0, 3).map((feature, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                {feature}
                              </li>
                            ))}
                            {subscriptionData.features.length > 3 && (
                              <li className="text-gray-500">
                                +{subscriptionData.features.length - 3} more features
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Changes will be saved to your range settings
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={saveSubscriptionData}
                disabled={saving || !rangeId || !ownerId}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? <LoadingSpinner /> : <Save className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}