"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function DocumentSection() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const documents = [
    {
      name: "BOL_CHI001.pdf",
      type: "Bill of Lading",
      status: "processed",
      size: "2.3 MB",
    },
    {
      name: "Rate_Confirmation.pdf",
      type: "Rate Con",
      status: "signed",
      size: "1.8 MB",
    },
    {
      name: "Invoice_INV2024.pdf",
      type: "Invoice",
      status: "pending",
      size: "945 KB",
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      if (isUploading) {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            setIsUploading(false);
            return 0;
          }
          return prev + 2;
        });
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isUploading]);

  return (
    <section
      id="documents"
      className="relative min-h-screen flex items-center py-20 overflow-hidden bg-gradient-to-l from-black via-gray-950 to-slate-950"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-l from-gray-950/30 via-slate-950/30 to-black/30" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Animated Demo */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative">
              {/* Document management interface */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-2xl border border-white/10">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-4 text-white font-medium">
                    Document Hub
                  </span>
                </div>

                {/* Drag and drop zone */}
                <motion.div
                  className={`border-2 border-dashed rounded-xl p-8 mb-6 transition-all duration-300 ${
                    dragActive || isUploading
                      ? "border-cyan-400 bg-cyan-400/10"
                      : "border-white/20 hover:border-white/40"
                  }`}
                  onDragEnter={() => setDragActive(true)}
                  onDragLeave={() => setDragActive(false)}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="text-center">
                    <motion.div
                      animate={dragActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{
                        duration: 0.5,
                        repeat: dragActive ? Infinity : 0,
                      }}
                      className="mb-4"
                    >
                      📄
                    </motion.div>
                    <p className="text-white font-medium mb-2">
                      {isUploading
                        ? "Processing Document..."
                        : "Drop BOL, Rate Con, or Invoice"}
                    </p>
                    <p className="text-slate-400 text-sm">
                      {isUploading
                        ? `${uploadProgress}% complete`
                        : "AI will auto-categorize and extract data"}
                    </p>

                    {isUploading && (
                      <div className="mt-4">
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <motion.div
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.2 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Document list */}
                <div className="space-y-3">
                  {documents.map((doc, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-sm font-bold">
                          PDF
                        </div>
                        <div>
                          <div className="text-white font-medium text-sm">
                            {doc.name}
                          </div>
                          <div className="text-slate-400 text-xs">
                            {doc.type} • {doc.size}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            doc.status === "processed"
                              ? "bg-green-400/20 text-green-400"
                              : doc.status === "signed"
                                ? "bg-blue-400/20 text-blue-400"
                                : "bg-orange-400/20 text-orange-400"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* AI Processing indicator */}
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="mt-4 flex items-center gap-2 text-cyan-400 text-sm"
                >
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  AI extracting key data points...
                </motion.div>
              </div>

              {/* Floating action button */}
              <motion.button
                className="absolute -bottom-6 -right-6 w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsUploading(true)}
              >
                📤
              </motion.button>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <motion.h2
              className="text-4xl sm:text-5xl font-bold text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Smart document
              </span>
              <br />
              management
            </motion.h2>

            <motion.p
              className="text-xl text-slate-300 mb-8 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              AI-powered document processing that understands trucking
              paperwork. Upload BOLs, rate confirmations, and invoices for
              instant data extraction.
            </motion.p>

            <div className="space-y-6">
              {[
                {
                  title: "AI Data Extraction",
                  description:
                    "Automatically extract pickup dates, delivery addresses, and freight details",
                  icon: "🤖",
                },
                {
                  title: "Digital Signatures",
                  description:
                    "Capture signatures on mobile devices with GPS location stamps",
                  icon: "✍️",
                },
                {
                  title: "Instant Sharing",
                  description:
                    "Share documents with brokers, customers, and accounting teams",
                  icon: "📤",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="p-4 rounded-xl border border-white/10 hover:border-white/20 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{feature.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-slate-400">{feature.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
