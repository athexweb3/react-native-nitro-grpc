# Using a ruby module to namespace the fix
module RNGrpc
  # Call this in your Podfile `target` block:
  #   RNGrpc.install_dependencies(self)
  def self.install_dependencies(podfile)
    Pod::UI.puts "Installing gRPC dependencies with modular headers...".green
    podfile.pod 'gRPC-C++', :modular_headers => true
    podfile.pod 'gRPC-Core', :modular_headers => true
  end

  def self.post_install(installer)
    log_file = '/tmp/grpc_debug.txt'
    File.open(log_file, 'w') { |f| f.puts "Starting post_install..." }

    Pod::UI.puts "Fixing gRPC Pods for React Native Nitro gRPC...".green
    
    src_map = File.join(installer.sandbox.root, 'gRPC-Core/include/grpc/module.modulemap')
    File.open(log_file, 'a') { |f| f.puts "Debug: Checking source map at #{src_map}" }
    
    if File.exist?(src_map)
       File.open(log_file, 'a') { |f| f.puts "Debug: Source map found!" }
    else
       File.open(log_file, 'a') { |f| f.puts "Debug: Source map NOT found!" }
    end

    installer.pods_project.targets.each do |target|
      if ['gRPC-Core', 'gRPC-C++', 'RNGrpc'].include?(target.name)
        target.build_configurations.each do |config|
          # Force module map generation for C++ libraries
          config.build_settings['DEFINES_MODULE'] = 'YES'
          
          # Allow including non-modular headers in frameworks (fixes Swift import issues)
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
          
          # Fix gRPC-Core module map not found issue
          if target.name == 'gRPC-Core'
             # Point to the actual module map in the source
             config.build_settings['MODULEMAP_FILE'] = '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap'
             config.build_settings['HEADER_SEARCH_PATHS'] ||= '$(inherited)'
             config.build_settings['HEADER_SEARCH_PATHS'] << ' "$(PODS_ROOT)/gRPC-Core/include"'
          end
          
          if target.name == 'gRPC-C++'
            config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
            
            # The Pods-generated xcconfig adds -fmodule-map-file to the broken Private Headers path.
            # We must redirect it to the actual source module map.
            cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
            
            # Replace the private path with the source path
            # We use specific string replacement to be safe
            src_module_map = '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap'
            
            # Note: The original flag is likely added by CocoaPods automatically, so it might not be in build_settings yet?
            # Actually, CocoaPods populates build_settings from podspecs. 
            # If it's not here, we might need to append a removal or just set it explicitly?
            # But the 'cat' showed it in the file.
            
            # Let's forcefully append the CORRECT flag. Clang usually takes the last one?
            # Or better, we define it ourselves to override?
            
            # If we simply append the correct path, clang might still complain about the missing first one.
            # We need to REMOVE the bad one if possible, but we don't see it here easily if it's inherited or injected later.
            
            # However, post_install runs before writing.
            # If we explicitly SET 'OTHER_CFLAGS' to include the correct map, 
            # does it override the auto-generated one?
            
            # Let's try appending the correct one AND the -fmodule-map-file argument.
            # But if the error is "file not found" for the FIRST argument, appending won't help.
            
            # The flag in xcconfig was: -fmodule-map-file="${PODS_ROOT}/Headers/Private/grpc/gRPC-Core.modulemap"
            
            # We can try to manipulate the 'pod_target_xcconfig' of the dependency? No, that's read-only here.
            
            # Let's act on the generated xcconfig content directly? NO, that's ugly.
            
            # Strategy: We essentially can't easily remove the flag if CocoaPods adds it during generation *after* this hook.
            # BUT, we can try to create the file at that location PERMANENTLY?
            # Or... wait. If CocoaPods adds it, surely it thinks the file is there.
            
            # Why does the file disappear?
            # Maybe we should try to fix the symlink issue again?
            # If I make the directory read-only? No.
            
            # Re-read: "OTHER_CFLAGS = $(inherited) -fmodule-map-file=..."
            # This is in the generated xcconfig.
            # Does config.build_settings contain it?
            # Debug log it.
            
             if cflags.is_a?(String) && cflags.include?('gRPC-Core.modulemap')
                 config.build_settings['OTHER_CFLAGS'] = cflags.gsub(
                    '${PODS_ROOT}/Headers/Private/grpc/gRPC-Core.modulemap', 
                    src_module_map
                 )
             end
          end

           # Suppress noisy warnings
          config.build_settings['WAR_FLAGS'] = '$(inherited) -Wno-documentation'
        end
      end
      
      # Method 2: Patch the generated xcconfig files directly for ALL targets
      # This is necessary because CocoaPods might have already generated the file with the bad flag
      # and Project build settings just inherit it.
      # We need to patch not just gRPC targets but also aggregation targets like Pods-GrpcExample
      xcconfig_dir = File.join(installer.sandbox.root, "Target Support Files/#{target.name}")
      Dir.glob("#{xcconfig_dir}/*.xcconfig").each do |xcconfig_path|
         if File.exist?(xcconfig_path)
            content = File.read(xcconfig_path)
            # Replace Private Headers path with Source path for module map
            # Handle multiple variants of the broken path
            if content.include?('Headers/Private/grpc/gRPC-Core.modulemap')
               Pod::UI.puts "Patching xcconfig: #{target.name}/#{File.basename(xcconfig_path)}".green
               
               # Replace all variants we might encounter
               new_content = content
                 .gsub("\"${PODS_ROOT}/Headers/Private/grpc/gRPC-Core.modulemap\"", "\"$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap\"")
                 .gsub('${PODS_ROOT}/Headers/Private/grpc/gRPC-Core.modulemap', '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap')
                 .gsub('$(PODS_ROOT)/Headers/Private/grpc/gRPC-Core.modulemap', '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap')
               
               File.write(xcconfig_path, new_content)
            end
         end
      end
    end
    
    # Manually copy/symlink module map to where CocoaPods expects it
    # This fixes the "gRPC-C++-dummy.m" error where it looks for it in Headers/Private
    src_map = File.join(installer.sandbox.root, 'gRPC-Core/include/grpc/module.modulemap')
    
    # Destination 1: Public Headers
    # Pods/Headers/Public/grpc/module.modulemap
    pub_headers = File.join(installer.sandbox.root, 'Headers/Public/grpc')
    FileUtils.mkdir_p(pub_headers)
    dst_map_pub = File.join(pub_headers, 'module.modulemap')
    
    if File.exist?(src_map)
      # Force link
      File.delete(dst_map_pub) if File.exist?(dst_map_pub) || File.symlink?(dst_map_pub)
      File.symlink(src_map, dst_map_pub)
      
      if File.exist?(dst_map_pub)
         File.open(log_file, 'a') { |f| f.puts "Debug: Public symlink created at #{dst_map_pub}" }
      else
         File.open(log_file, 'a') { |f| f.puts "Debug: Failed to check public symlink at #{dst_map_pub}" }
      end
    end

    # Destination 2: Private Headers (sometimes needed by dummy targets)
    # Pods/Headers/Private/grpc/gRPC-Core.modulemap
    priv_headers = File.join(installer.sandbox.root, 'Headers/Private/grpc')
    FileUtils.mkdir_p(priv_headers)
    dst_map_priv = File.join(priv_headers, 'gRPC-Core.modulemap')
    
    if File.exist?(src_map)
        File.delete(dst_map_priv) if File.exist?(dst_map_priv) || File.symlink?(dst_map_priv)
        File.symlink(src_map, dst_map_priv)
        
        if File.exist?(dst_map_priv)
         File.open(log_file, 'a') { |f| f.puts "Debug: Private symlink created at #{dst_map_priv}" }
        end
    end

  end
end
