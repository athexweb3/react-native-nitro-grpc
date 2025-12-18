# Call this method in your Podfile 'target' block to install dependencies:
#   setup_grpc(self)
#
# And call it in your 'post_install' block to fix build issues:
#   setup_grpc(installer)
#
def setup_grpc(spec)
  # Check if we are in a Podspec (adding dependencies)
  if spec.respond_to?(:dependency)
    Pod::UI.puts "Adding gRPC dependencies to #{spec.name} spec...".green
    # Standard spec dependencies (for headers/linking)
    spec.dependency 'gRPC-C++'
    spec.dependency 'gRPC-Core'

    begin
      # Try to inject 'modular_headers => true' into the Podfile
      if defined?(Pod::Config) && Pod::Config.instance && Pod::Config.instance.podfile
        podfile = Pod::Config.instance.podfile
        valid_targets = podfile.target_definitions.values.reject { |t| t.name == 'Pods' }
        
        valid_targets.each do |target|
          # Only inject if not already present to avoid duplication
          unless target.dependencies.any? { |d| d.name == 'gRPC-C++' }
             Pod::UI.puts "Injecting 'gRPC-C++' (modular) into Podfile target '#{target.name}'...".green
             target.store_pod('gRPC-C++', :modular_headers => true)
          end
          unless target.dependencies.any? { |d| d.name == 'gRPC-Core' }
             Pod::UI.puts "Injecting 'gRPC-Core' (modular) into Podfile target '#{target.name}'...".green
             target.store_pod('gRPC-Core', :modular_headers => true)
          end
        end
   
        # Inject post_install hook
        previous_post_install = podfile.instance_variable_get(:@post_install_callback)
        
        new_post_install = Proc.new do |installer|
           # Run previous hook if it existed
           previous_post_install.call(installer) if previous_post_install
           
           # Run our hook
           setup_grpc(installer)
        end
        
        podfile.instance_variable_set(:@post_install_callback, new_post_install)
        Pod::UI.puts "Injected 'setup_grpc' into Podfile post_install hook!".green
      end
    rescue => e
      Pod::UI.puts "Warning: Failed to inject gRPC dependencies/hooks into Podfile: #{e.message}".yellow
      Pod::UI.puts e.backtrace.join("\n").yellow if Pod::Config.instance.verbose?
    end

    return
  end
 

  # Check if we are in the 'pod' definition phase (dependencies in Podfile)
  if spec.respond_to?(:pod)
    Pod::UI.puts "Installing gRPC dependencies with modular headers...".green
    spec.pod 'gRPC-C++', :modular_headers => true
    spec.pod 'gRPC-Core', :modular_headers => true
    return
  end

  # Check if we are in the 'post_install' phase (installer)
  if spec.respond_to?(:pods_project)
    installer = spec
    log_file = '/tmp/grpc_debug.txt'
    File.open(log_file, 'w') { |f| f.puts "Starting post_install..." }

    Pod::UI.puts "Fixing gRPC Pods for React Native Nitro gRPC...".green

    # Fix XCode 16 "Internal inconsistency error" by disabling aggressive build system optimizations
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      config.build_settings['VALIDATE_WORKSPACE'] = 'NO'
      config.build_settings['COMPILER_INDEX_STORE_ENABLE'] = 'NO'
    end

    src_map = File.join(installer.sandbox.root, 'gRPC-Core/include/grpc/module.modulemap')
    File.open(log_file, 'a') do |f|
       f.puts "Debug: Checking source map at #{src_map}"
       if File.exist?(src_map)
         f.puts "Debug: Source map found!"
       else
         f.puts "Debug: Source map NOT found!"
       end
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

             # Disable parallel builds for gRPC-Core to avoid XCode build system inconsistencies
             config.build_settings['DISABLE_MANUAL_TARGET_ORDER_BUILD_WARNING'] = 'YES'
          end

          if target.name == 'gRPC-C++'
            config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'

            # The Pods-generated xcconfig adds -fmodule-map-file to the broken Private Headers path.
            # We must redirect it to the actual source module map.
            cflags = config.build_settings['OTHER_CFLAGS'] || '$(inherited)'
            src_module_map = '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap'

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
      xcconfig_dir = File.join(installer.sandbox.root, "Target Support Files/#{target.name}")
      Dir.glob("#{xcconfig_dir}/*.xcconfig").each do |xcconfig_path|
         if File.exist?(xcconfig_path)
            content = File.read(xcconfig_path)
            # Replace Private Headers path with Source path for module map
            if content.include?('Headers/Private/grpc/gRPC-Core.modulemap')
               Pod::UI.puts "Patching xcconfig: #{target.name}/#{File.basename(xcconfig_path)}".green

               new_content = content
                 .gsub("\"${PODS_ROOT}/Headers/Private/grpc/gRPC-Core.modulemap\"", "\"$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap\"")
                 .gsub('${PODS_ROOT}/Headers/Private/grpc/gRPC-Core.modulemap', '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap')
                 .gsub('$(PODS_ROOT)/Headers/Private/grpc/gRPC-Core.modulemap', '$(PODS_ROOT)/gRPC-Core/include/grpc/module.modulemap')

               File.write(xcconfig_path, new_content)
            end
         end
      end
    end

    # Add a pre-build script phase to create the gRPC module map symlink
    # This ensures the symlink exists even after CocoaPods cleans up headers
    installer.pods_project.targets.each do |target|
      if target.name.include?('gRPC-C++') || target.name.include?('Pods-')
        script_phase = target.new_shell_script_build_phase('Create gRPC Module Map Symlink')
        script_phase.shell_script = <<~SCRIPT
          set -e
          PODS_ROOT="${PODS_ROOT:-${SRCROOT}}"
          SRC_MAP="$PODS_ROOT/gRPC-Core/include/grpc/module.modulemap"

          if [ -f "$SRC_MAP" ]; then
            mkdir -p "$PODS_ROOT/Headers/Private/grpc"
            ln -sf "$SRC_MAP" "$PODS_ROOT/Headers/Private/grpc/gRPC-Core.modulemap" 2>/dev/null || true

            mkdir -p "$PODS_ROOT/Headers/Public/grpc"
            ln -sf "$SRC_MAP" "$PODS_ROOT/Headers/Public/grpc/module.modulemap" 2>/dev/null || true
          fi
        SCRIPT

        target.build_phases.move(script_phase, 0)
        Pod::UI.puts "Added gRPC module map symlink script to #{target.name}".green
      end
    end
    return
  end
  
  # If spec doesn't match expected types
  Pod::UI.puts "Warning: setup_grpc called with unrecognized spec: #{spec.class}".orange
end
